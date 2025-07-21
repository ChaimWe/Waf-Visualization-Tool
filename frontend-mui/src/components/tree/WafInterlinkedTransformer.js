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

  transformRules(nodesPerRow = 8) {
    // Layout params matching FlowChart hierarchicalLayout
    const rowGap = 120;
    const groupGap = 180;
    // Use the parameter instead of hardcoded value
    // const nodesPerRow = 8; // match default in FlowChart
    const aclRows = Math.ceil(this.aclRules.length / nodesPerRow);
    const albY = aclRows * rowGap + groupGap;

    // Create nodes for ACL rules (top group)
    const aclNodes = this.aclRules.map((rule, idx) => {
      const row = Math.floor(idx / nodesPerRow);
      const col = idx % nodesPerRow;
      return {
        id: 'acl-' + (rule.Name || rule.name || rule.Id || String(idx)),
        type: 'custom-node',
        position: { x: col * 200, y: row * rowGap },
        data: {
          ...rule,
          nodeType: 'acl',
          viewType: 'waf',
          name: rule.Name || rule.name || rule.Id || `ACL Rule ${idx + 1}`,
          priority: rule.Priority || rule.priority || idx + 1,
          action: rule.Action ? Object.keys(rule.Action)[0] : (rule.action || ''),
          borderColor: '#e75480',
          metric: rule.VisibilityConfig?.MetricName || ''
        },
      };
    });
    // Create nodes for ALB rules (bottom group, y-offset)
    const albNodes = this.albRules.map((rule, idx) => {
      const row = Math.floor(idx / nodesPerRow);
      const col = idx % nodesPerRow;
      return {
        id: 'alb-' + (rule.Name || rule.name || rule.Id || String(idx)),
        type: 'custom-node',
        position: { x: col * 200, y: albY + row * rowGap },
        data: {
          ...rule,
          nodeType: 'alb',
          viewType: 'waf',
          name: rule.Name || rule.name || rule.Id || `ALB Rule ${idx + 1}`,
          priority: rule.Priority || rule.priority || idx + 1,
          action: rule.Actions ? (rule.Actions[0]?.Type || 'Unknown') : (rule.action || ''),
          borderColor: 'orange',
          metric: rule.VisibilityConfig?.MetricName || ''
        },
      };
    });

    // --- Header-based edge logic ---
    // 1. Find headers modified by ACL rules (robust, recursive, case-insensitive)
    function findInsertedHeaders(obj) {
      let headers = [];
      if (!obj || typeof obj !== 'object') return headers;
      // Look for CustomRequestHandling.InsertHeaders
      if (obj.CustomRequestHandling && Array.isArray(obj.CustomRequestHandling.InsertHeaders)) {
        obj.CustomRequestHandling.InsertHeaders.forEach(hdr => {
          if (hdr.Name) headers.push(hdr.Name.toLowerCase());
        });
      }
      // Recurse into all object values
      Object.values(obj).forEach(val => {
        headers = headers.concat(findInsertedHeaders(val));
      });
      return headers;
    }
    const headerToAclNodes = {};
    this.aclRules.forEach((rule, idx) => {
      const headers = findInsertedHeaders(rule.Action);
      headers.forEach(headerName => {
        if (!headerToAclNodes[headerName]) headerToAclNodes[headerName] = [];
        headerToAclNodes[headerName].push(aclNodes[idx]);
      });
    });
    // 2. Find ALB rules that depend on headers (robust, recursive, case-insensitive)
    function findHeaderMatches(obj) {
      if (!obj || typeof obj !== 'object') return [];
      let matches = [];
      if (obj.FieldToMatch && obj.FieldToMatch.SingleHeader && obj.FieldToMatch.SingleHeader.Name) {
        matches.push(obj.FieldToMatch.SingleHeader.Name.toLowerCase());
      }
      Object.values(obj).forEach(val => {
        matches = matches.concat(findHeaderMatches(val));
      });
      return matches;
    }
    const headerToAlbNodes = {};
    this.albRules.forEach((rule, idx) => {
      const headers = findHeaderMatches(rule.Statement);
      headers.forEach(headerName => {
        if (!headerToAlbNodes[headerName]) headerToAlbNodes[headerName] = [];
        headerToAlbNodes[headerName].push(albNodes[idx]);
      });
    });
    // 3. Create edges for matching headers (case-insensitive)
    const edges = [];
    Object.keys(headerToAclNodes).forEach(headerName => {
      if (headerToAlbNodes[headerName]) {
        headerToAclNodes[headerName].forEach(aclNode => {
          headerToAlbNodes[headerName].forEach(albNode => {
            edges.push({
              id: `edge-headerdep-${aclNode.id}-${albNode.id}`,
              source: aclNode.id,
              target: albNode.id,
              type: 'custom',
              edgeType: 'header-dependency',
              label: `Header: ${headerName}`
            });
          });
        });
      }
    });
    const result = { nodes: [...aclNodes, ...albNodes], edges };
    return result;
  }
} 