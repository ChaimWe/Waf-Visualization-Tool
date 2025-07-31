import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";

import {
  WAFV2Client,
  ListWebACLsCommand,
  GetWebACLCommand,
  GetRuleGroupCommand
} from "@aws-sdk/client-wafv2";

// FIX: Use default import for ELBv2Client and DescribeLoadBalancersCommand
import elbv2Pkg from "@aws-sdk/client-elastic-load-balancing-v2";
const { ELBv2Client, DescribeLoadBalancersCommand } = elbv2Pkg;

dotenv.config();
const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { accessKeyId, secretAccessKey, region } = req.body;
    
    if (!accessKeyId || !secretAccessKey || !region) {
      return res.status(400).json({ 
        error: 'Missing credentials',
        message: 'Access key, secret key, and region are required'
      });
    }

    // Test AWS credentials by making a simple API call
    const testClient = new WAFV2Client({
      accessKeyId,
      secretAccessKey,
      region
    });

    try {
      // Test the credentials with a simple API call
      const testCommand = new ListWebACLsCommand({ Scope: 'REGIONAL' });
      await testClient.send(testCommand);
      
      // Store credentials in session
      req.session.awsCredentials = { accessKeyId, secretAccessKey, region };
      req.session.authenticated = true;
      
      res.json({ 
        success: true, 
        message: 'Successfully authenticated with AWS'
      });
    } catch (awsError) {
      console.error('AWS authentication failed:', awsError);
      res.status(401).json({ 
        error: 'Invalid AWS credentials',
        message: 'The provided AWS credentials are invalid or insufficient'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: 'An error occurred during authentication'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        error: 'Logout failed',
        message: 'Failed to destroy session'
      });
    }
    res.json({ success: true, message: 'Successfully logged out' });
  });
});

app.get('/api/auth/status', (req, res) => {
  res.json({ 
    authenticated: req.session.authenticated || false,
    hasCredentials: !!req.session.awsCredentials
  });
});

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.authenticated || !req.session.awsCredentials) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in with your AWS credentials'
    });
  }
  next();
};

// Helper to get AWS client with user credentials
const getUserWAFClient = (region, req) => {
  const credentials = req.session.awsCredentials;
  if (!credentials) {
    throw new Error('No AWS credentials found in session');
  }
  
  return new WAFV2Client({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    region: region
  });
};

const getUserELBClient = (region, req) => {
  const credentials = req.session.awsCredentials;
  if (!credentials) {
    throw new Error('No AWS credentials found in session');
  }
  
  return new ELBv2Client({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    region: region
  });
};

app.get("/api/waf-acls-names/region/:region", requireAuth, async (req, res) => {
  try {
    const regionParam = req.params.region;
    console.log(`Fetching WAF ACLs for region: ${regionParam}`);

    const scope = regionParam.toUpperCase() === "CLOUDFRONT" || regionParam.toUpperCase() === "GLOBAL"
      ? "CLOUDFRONT"
      : "REGIONAL";

    const clientConfig = scope === "CLOUDFRONT"
      ? { region: req.session.awsCredentials.region }
      : { region: regionParam };

    const wafClientForRegion = getUserWAFClient(clientConfig.region, req);

    const command = new ListWebACLsCommand({ Scope: scope });
    const response = await wafClientForRegion.send(command);
    const acls = response.WebACLs || [];

    const aclNames = acls.map(acl => acl.Name);

    res.json(aclNames);
  } catch (error) {
    console.error("Error fetching WAF ACLs for region:", error);
    res.status(500).json({ 
      error: "Error fetching WAF ACLs",
      message: error.message || 'Failed to fetch WAF ACLs'
    });
  }
});

app.get("/api/waf-acl-details/region/:region/name/:name", requireAuth, async (req, res) => {
  try {
    const { region, name } = req.params;
    console.log(`🚀 Fetching ACL details for region: ${region}, name: ${name}`);

    const scope =
      region.toUpperCase() === "CLOUDFRONT" || region.toUpperCase() === "GLOBAL"
        ? "CLOUDFRONT"
        : "REGIONAL";

    const clientConfig =
      scope === "CLOUDFRONT"
        ? { region: req.session.awsCredentials.region } 
        : { region };
    const wafClientForRegion = getUserWAFClient(clientConfig.region, req);

    const listCommand = new ListWebACLsCommand({ Scope: scope });
    const listResponse = await wafClientForRegion.send(listCommand);
    const acls = listResponse.WebACLs || [];

    const acl = acls.find(item => item.Name === name);
    if (!acl) {
      return res.status(404).json({ 
        error: `ACL with name ${name} not found in region ${region}`,
        message: 'The specified WAF ACL could not be found'
      });
    }

    const getCommand = new GetWebACLCommand({
      Id: acl.Id,
      Name: acl.Name,
      Scope: scope
    });
    const aclDetailsResponse = await wafClientForRegion.send(getCommand);
    let details = aclDetailsResponse.WebACL;
    if (!details) {
      return res.status(404).json({ 
        error: `ACL details for ${name} not found`,
        message: 'Failed to retrieve ACL details'
      });
    }

    if (details.Rules) {
      details.Rules = await Promise.all(details.Rules.map(async rule => {
        if (rule.Statement?.RuleGroupReferenceStatement) {
          const rgArn = rule.Statement.RuleGroupReferenceStatement.ARN;
          try {
            const rgCommand = new GetRuleGroupCommand({
              ARN: rgArn,
              Scope: scope
            });
            const rgResponse = await wafClientForRegion.send(rgCommand);
            rule.RuleGroup = rgResponse.RuleGroup;
          } catch (error) {
            console.error(`❌ Error fetching rule group for ARN ${rgArn}:`, error);
            // Continue without the rule group rather than failing completely
          }
        }
        return rule;
      }));
    }

    res.json(details);
  } catch (error) {
    console.error("❌ Error in /api/waf-acl-details:", error);
    res.status(500).json({ 
      error: "Error fetching ACL details",
      message: error.message || 'Failed to fetch ACL details'
    });
  }
});

// Mock ALB data
const mockAlbs = [
  { id: '1', name: 'ALB-1', region: 'us-east-1', attachedAcls: ['acl-1', 'acl-2'] },
  { id: '2', name: 'ALB-2', region: 'us-west-2', attachedAcls: ['acl-3'] },
];

// Mock ACL data
const mockAcls = [
  { id: 'acl-1', name: 'ACL-1', rules: [] },
  { id: 'acl-2', name: 'ACL-2', rules: [] },
  { id: 'acl-3', name: 'ACL-3', rules: [] },
];

// Helper to fetch ALB from AWS
async function fetchAlbFromAws(albId, req) {
  try {
    const client = getUserELBClient(req.session.awsCredentials.region, req);
    const command = new DescribeLoadBalancersCommand({ LoadBalancerArns: [albId] });
    const response = await client.send(command);
    if (response.LoadBalancers && response.LoadBalancers.length > 0) {
      const alb = response.LoadBalancers[0];
      return {
        id: alb.LoadBalancerArn,
        name: alb.LoadBalancerName,
        region: req.session.awsCredentials.region,
        dnsName: alb.DNSName,
        type: alb.Type,
        scheme: alb.Scheme,
        state: alb.State?.Code,
        vpcId: alb.VpcId,
        // attachedAcls: [] // You can add logic to fetch attached ACLs if needed
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching ALB from AWS:', error);
    throw error;
  }
}

// Endpoint for ALB details (real AWS)
app.get('/api/alb/:albId', requireAuth, async (req, res) => {
  const { albId } = req.params;
  try {
    const alb = await fetchAlbFromAws(albId, req);
    if (!alb) {
      return res.status(404).json({ 
        error: `ALB with id ${albId} not found in AWS`,
        message: 'The specified ALB could not be found'
      });
    }
    res.json(alb);
  } catch (err) {
    console.error('Error fetching ALB from AWS:', err);
    // Fallback to mock data if AWS call fails
    const alb = mockAlbs.find(a => a.id === albId);
    if (alb) {
      return res.json(alb);
    }
    res.status(500).json({ 
      error: 'Error fetching ALB from AWS and no mock data available.',
      message: 'Failed to fetch ALB details'
    });
  }
});

// Endpoint for ALB+ACL details (real AWS for ALB, mock for ACL)
app.get('/api/alb-acl/:albId/:aclId', requireAuth, async (req, res) => {
  const { albId, aclId } = req.params;
  try {
    const alb = await fetchAlbFromAws(albId, req);
    const acl = mockAcls.find(a => a.id === aclId); // Replace with real ACL fetch if needed
    if (!alb || !acl) {
      return res.status(404).json({ 
        error: `ALB or ACL not found`,
        message: 'The specified ALB or ACL could not be found'
      });
    }
    res.json({ alb, acl });
  } catch (err) {
    console.error('Error fetching ALB+ACL from AWS:', err);
    // Fallback to mock data if AWS call fails
    const fallbackAlb = mockAlbs.find(a => a.id === albId);
    const fallbackAcl = mockAcls.find(a => a.id === aclId);
    if (fallbackAlb && fallbackAcl) {
      return res.json({ alb: fallbackAlb, acl: fallbackAcl });
    }
    res.status(500).json({ 
      error: 'Error fetching ALB+ACL from AWS and no mock data available.',
      message: 'Failed to fetch ALB and ACL details'
    });
  }
});

// Endpoint to check if AWS credentials are present (now checks session)
app.get('/api/aws-credentials-status', (req, res) => {
  try {
    const hasCredentials = req.session.authenticated && !!req.session.awsCredentials;
    res.json({ hasCredentials });
  } catch (error) {
    console.error('Error checking AWS credentials:', error);
    res.status(500).json({ 
      error: 'Error checking AWS credentials',
      message: 'Failed to verify AWS credentials'
    });
  }
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});