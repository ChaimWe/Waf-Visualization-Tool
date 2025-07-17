// waf-visualization-tool/frontend-mui/src/components/tree/AlbRuleTransformer.js
export default class AlbRuleTransformer {
  constructor(rulesArray) {
    this.rulesArray = rulesArray;
    this.edges = [];
    this.nodeIdMap = new Map(); // Map rule name to node id
  }

  getNodeStyle(rule, isCompound = false, isCondition = false) {
    // Color palette
    const lightGreen = '#81c784';
    const mediumGreen = '#388e3c';
    const paleGreen = '#a5d6a7';
    const red = '#e53935';
    const yellow = '#fff9c4';
    const gray = '#bdbdbd';
    // Block/Allow/Count detection
    const action = rule.Actions ? (rule.Actions[0]?.Type || '').toUpperCase() : (rule.action || '').toUpperCase();
    if (action === 'BLOCK') {
      return {
        background: lightGreen,
        border: `3px solid ${red}`,
        color: '#222',
        fontWeight: 'bold',
      };
    } else if (action === 'ALLOW' || action === 'COUNT') {
      return {
        background: yellow,
        border: `3px solid ${gray}`,
        color: '#888',
      };
    } else if (isCompound) {
      return {
        background: paleGreen,
        border: `3px solid ${mediumGreen}`,
        color: '#222',
      };
    } else if (isCondition) {
      return {
        background: paleGreen,
        border: `2px solid ${mediumGreen}`,
        color: mediumGreen,
        fontStyle: 'italic',
        fontSize: '0.9em',
      };
    } else {
      return {
        background: lightGreen,
        border: `3px solid ${mediumGreen}`,
        color: '#222',
        fontWeight: 'bold',
      };
    }
  }

  getEdgeStyle(type = 'alb') {
    // type: 'alb' (default), 'crosslayer'
    if (type === 'crosslayer') {
      return {
        stroke: '#ffa726',
        strokeWidth: 3,
        strokeDasharray: '4 2',
      };
    }
    // Default ALB logic edge
    return {
      stroke: '#43a047',
      strokeWidth: 2,
    };
  }

  transformRules() {
    // First, create nodes for each rule
    const nodes = this.rulesArray.map((rule, idx) => {
      const id = rule.Name || rule.name || rule.Id || String(idx);
      this.nodeIdMap.set(id, id);
      return {
        id,
        type: 'custom-node',
        data: {
          ...rule,
          name: rule.Name || rule.name || rule.Id || `ALB Rule ${idx + 1}`,
          priority: rule.Priority || rule.priority || idx + 1,
          action: rule.Actions ? (rule.Actions[0]?.Type || 'Unknown') : (rule.action || ''),
          borderColor: 'orange',
        },
        style: this.getNodeStyle(rule),
      };
    });

    // Now, create edges for compound statements
    this.rulesArray.forEach((rule, idx) => {
      const parentId = rule.Name || rule.name || rule.Id || String(idx);
      // ALB rules use Conditions array for logic
      if (Array.isArray(rule.Conditions)) {
        rule.Conditions.forEach((cond, condIdx) => {
          // Compound: AndStatement, OrStatement, NotStatement
          if (cond.AndStatement && Array.isArray(cond.AndStatement.Conditions)) {
            cond.AndStatement.Conditions.forEach((subCond, subIdx) => {
              const childId = `${parentId}-and-${condIdx}-${subIdx}`;
              nodes.push({
                id: childId,
                type: 'custom-node',
                data: {
                  ...subCond,
                  name: subCond.Field || 'AndCondition',
                  borderColor: 'orange',
                  isCompound: true,
                },
                style: this.getNodeStyle(subCond, true, false),
              });
              this.edges.push({ source: parentId, target: childId, style: this.getEdgeStyle('alb') });
            });
          } else if (cond.OrStatement && Array.isArray(cond.OrStatement.Conditions)) {
            cond.OrStatement.Conditions.forEach((subCond, subIdx) => {
              const childId = `${parentId}-or-${condIdx}-${subIdx}`;
              nodes.push({
                id: childId,
                type: 'custom-node',
                data: {
                  ...subCond,
                  name: subCond.Field || 'OrCondition',
                  borderColor: 'orange',
                  isCompound: true,
                },
                style: this.getNodeStyle(subCond, true, false),
              });
              this.edges.push({ source: parentId, target: childId, style: this.getEdgeStyle('alb') });
            });
          } else if (cond.NotStatement && cond.NotStatement.Condition) {
            const subCond = cond.NotStatement.Condition;
            const childId = `${parentId}-not-${condIdx}`;
            nodes.push({
              id: childId,
              type: 'custom-node',
              data: {
                ...subCond,
                name: subCond.Field || 'NotCondition',
                borderColor: 'orange',
                isCompound: true,
              },
              style: this.getNodeStyle(subCond, true, false),
            });
            this.edges.push({ source: parentId, target: childId, style: this.getEdgeStyle('alb') });
          } else if (cond.Field) {
            // Simple condition node (header, URI, etc.)
            const childId = `${parentId}-cond-${condIdx}`;
            nodes.push({
              id: childId,
              type: 'custom-node',
              data: {
                ...cond,
                name: cond.Field,
                isCondition: true,
              },
              style: this.getNodeStyle(cond, false, true),
            });
            this.edges.push({ source: parentId, target: childId, style: this.getEdgeStyle('alb') });
          }
        });
      }
    });

    return { nodes, edges: this.edges };
  }
} 