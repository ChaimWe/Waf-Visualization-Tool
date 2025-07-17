// waf-visualization-tool/frontend-mui/src/components/tree/WafInterlinkedTransformer.js
export default class WafInterlinkedTransformer {
  constructor(aclRules, albRules) {
    this.aclRules = aclRules || [];
    this.albRules = albRules || [];
  }

  // Helper to extract all headers from a rule's statement
  static extractHeaders(statement) {
    const headers = [];
    function recurse(obj) {
      if (!obj || typeof obj !== 'object') return;
      if (obj.FieldToMatch && obj.FieldToMatch.SingleHeader && obj.FieldToMatch.SingleHeader.Name) {
        headers.push(obj.FieldToMatch.SingleHeader.Name.toLowerCase());
      }
      Object.values(obj).forEach(recurse);
    }
    recurse(statement);
    return headers;
  }

  transformRules() {
    // Layout params matching FlowChart hierarchicalLayout
    const rowGap = 120;
    const groupGap = 180;
    const nodesPerRow = 8; // match default in FlowChart
    const aclRows = Math.ceil(this.aclRules.length / nodesPerRow);
    const albY = aclRows * rowGap + groupGap;

    // Create nodes for ACL rules (parents)
    const aclNodes = this.aclRules.map((rule, idx) => ({
      id: 'acl-' + (rule.Name || rule.name || rule.Id || String(idx)),
      type: 'custom-node',
      position: { x: idx * 180, y: 0 }, // Top row
      data: {
        ...rule,
        nodeType: 'acl',
        viewType: 'waf',
        name: rule.Name || rule.name || rule.Id || `ACL Rule ${idx + 1}`,
        priority: rule.Priority || rule.priority || idx + 1,
        action: rule.Action ? Object.keys(rule.Action)[0] : (rule.action || ''),
        borderColor: '#e75480',
      },
    }));
    // Create nodes for ALB rules (children), offset x by 90px for separation, y by calculated spacing
    const albNodes = this.albRules.map((rule, idx) => ({
      id: 'alb-' + (rule.Name || rule.name || rule.Id || String(idx)),
      type: 'custom-node',
      position: { x: idx * 180 + 90, y: albY }, // Bottom row, offset x by 90px, y by calculated spacing
      data: {
        ...rule,
        nodeType: 'alb',
        viewType: 'waf',
        name: rule.Name || rule.name || rule.Id || `ALB Rule ${idx + 1}`,
        priority: rule.Priority || rule.priority || idx + 1,
        action: rule.Actions ? (rule.Actions[0]?.Type || 'Unknown') : (rule.action || ''),
        borderColor: 'orange',
      },
    }));

    // --- New edge logic ---
    // 1. For each ACL rule, find injected headers via CustomRequestHandling when LabelMatchStatement is present
    const aclInjectedHeaders = this.aclRules.map((rule, i) => {
      // Find LabelMatchStatement
      function findLabelMatch(obj) {
        if (!obj || typeof obj !== 'object') return false;
        if (obj.LabelMatchStatement && obj.LabelMatchStatement.Key) return true;
        return Object.values(obj).some(findLabelMatch);
      }
      const hasLabelMatch = findLabelMatch(rule.Statement);
      // Find injected headers
      let injectedHeaders = [];
      if (rule.Action?.Count?.CustomRequestHandling?.InsertHeaders) {
        injectedHeaders = rule.Action.Count.CustomRequestHandling.InsertHeaders.map(h => h.Name.toLowerCase());
      }
      if (hasLabelMatch && injectedHeaders.length > 0) {
        return { id: aclNodes[i].id, headers: injectedHeaders };
      }
      return null;
    }).filter(Boolean);

    // 2. For each ALB rule, find ByteMatchStatement on a header
    const albHeaderMatches = this.albRules.map((rule, i) => {
      // Find all ByteMatchStatements on headers
      function findHeaderMatches(obj) {
        if (!obj || typeof obj !== 'object') return [];
        let matches = [];
        if (obj.ByteMatchStatement && obj.ByteMatchStatement.FieldToMatch?.SingleHeader?.Name) {
          matches.push(obj.ByteMatchStatement.FieldToMatch.SingleHeader.Name.toLowerCase());
        }
        Object.values(obj).forEach(val => {
          matches = matches.concat(findHeaderMatches(val));
        });
        return matches;
      }
      const headers = findHeaderMatches(rule.Statement);
      if (headers.length > 0) {
        return { id: albNodes[i].id, headers };
      }
      return null;
    }).filter(Boolean);

    // 3. Create edges from ACL to ALB if injected header matches inspected header
    const edges = [];
    for (const acl of aclInjectedHeaders) {
      for (const alb of albHeaderMatches) {
        const shared = acl.headers.filter(h => alb.headers.includes(h));
        if (shared.length > 0) {
          edges.push({
            id: `edge-${acl.id}-${alb.id}`,
            source: acl.id,
            target: alb.id,
            label: shared.join(', '),
            type: 'custom',
            data: { viewType: 'waf', targetAction: (albNodes.find(n => n.id === alb.id)?.data?.action || '') },
          });
        }
      }
    }

    return { nodes: [...aclNodes, ...albNodes], edges };
  }
} 