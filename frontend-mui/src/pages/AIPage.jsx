import React from 'react';
import { Box, Container, Paper, Typography, Button, Chip, Alert } from '@mui/material';
import { useThemeContext } from '../context/ThemeContext';
// TODO: Replace with actual image if/when available
// import bgImage from '../assets/pexels-scottwebb-1029624.jpg';
import CustomSnackbar from '../components/popup/CustomSnackbar';
import { useDataSource } from '../context/DataSourceContext';
import AIChatPanel from '../components/popup/AIChatPanel';
import RuleTransformer from '../components/tree/RuleTransformer';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useTheme } from '@mui/material';

// Simple error boundary for the page
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        // Optionally log error
    }
    render() {
        if (this.state.hasError) {
            return <Box sx={{ p: 4, color: 'error.main' }}>Something went wrong: {String(this.state.error)}</Box>;
        }
        return this.props.children;
    }
}

const AIPage = () => {
    const [loaderOpen, setLoaderOpen] = React.useState(false);
    const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'info' });
    const theme = useTheme();
    const { darkTheme } = useThemeContext();
    const { aclData, albData } = useDataSource();
    
    // Combine ACL and ALB rules
    const rules = React.useMemo(() => {
        const aclRules = (aclData?.rules || aclData?.Rules) || [];
        const albRules = (albData?.rules || albData?.Rules) || [];
        return [...aclRules, ...albRules];
    }, [aclData, albData]);

    const handleRulesLoaded = (loadedRules) => {
        // This function is no longer needed since we use DataSourceContext
        setSnackbar({ open: true, message: `Rules loaded from context!`, severity: 'success' });
    };

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    const dependencyEdges = React.useMemo(() => {
        if (!rules || rules.length === 0) return [];
        const ruleTransformer = new RuleTransformer(rules);
        const result = ruleTransformer.transformRules();
        return result?.edges || [];
    }, [rules]);

    // Defensive fallback for missing context
    if (typeof aclData === 'undefined' && typeof albData === 'undefined') {
        return (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
                <Paper sx={{ p: 4, borderRadius: 3, bgcolor: 'background.paper' }}>
                    <Typography variant="h5" color="error" gutterBottom>
                        Data context not available
                    </Typography>
                    <Typography variant="body1">
                        The required data context is missing or broken. Please reload the app or check your data source setup.
                    </Typography>
                </Paper>
            </Box>
        );
    }

    return (
        <ErrorBoundary>
            <Box sx={{ width: '100vw', height: '100vh', p: 0, m: 0, position: 'relative', background: darkTheme ? '#222' : '#e0e0e0' }}>
                {/* Dark Overlay for Dark Mode */}
                {darkTheme && (
                    <Box sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.55)',
                        zIndex: 1,
                        pointerEvents: 'none',
                    }} />
                )}
                {/* Centered Content Area */}
                <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', height: '100%', zIndex: 2, p: 0, m: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
                    {/* Header Section */}
                    <Paper elevation={3} sx={{ p: 4, borderRadius: 4, mb: 4, width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <SmartToyIcon color="primary" />
                            <Typography variant="h4" fontWeight={700}>
                                AI Assistant
                            </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={500} color="text.secondary" mb={2}>
                            Chat with AI about your WAF rules for insights and recommendations
                        </Typography>
                    </Paper>
                    {/* Rule status and loader */}
                    <Paper sx={{ p: 3, mb: 3, width: '100%' }}>
                        {rules.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography variant="body1" sx={{ color: theme.palette.text.primary, mb: 2 }}>
                                    No rules loaded yet. You can still chat with the AI Assistant!
                                </Typography>
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    Use the upload buttons in the top bar to load your WAF/ACL or ALB rules for more context.
                                </Alert>
                            </Box>
                        ) : (
                            <Box>
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    <Typography variant="body1">
                                        <strong>{rules.length}</strong> rules loaded successfully
                                    </Typography>
                                </Alert>
                                <Typography variant="h6" sx={{ color: theme.palette.text.primary, mb: 2 }}>
                                    Rule Types:
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                    {(() => {
                                        const ruleTypes = {};
                                        rules.forEach(rule => {
                                            const type = rule.Statement?.Type || 'Unknown';
                                            ruleTypes[type] = (ruleTypes[type] || 0) + 1;
                                        });
                                        return Object.entries(ruleTypes).map(([type, count]) => (
                                            <Chip
                                                key={type}
                                                label={`${type}: ${count}`}
                                                color="primary"
                                                variant="outlined"
                                                size="small"
                                            />
                                        ));
                                    })()}
                                </Box>
                            </Box>
                        )}
                    </Paper>
                    {/* AI Chat Panel always rendered */}
                    <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <AIChatPanel
                            rule={rules[0] || {}}
                            allRules={rules}
                            edges={dependencyEdges}
                            isAIPage={true}
                            noRules={rules.length === 0}
                        />
                    </Box>
                </Box>
                {/* Snackbar for notifications */}
                <CustomSnackbar
                    open={snackbar.open}
                    message={snackbar.message}
                    severity={snackbar.severity}
                    onClose={handleCloseSnackbar}
                />
            </Box>
        </ErrorBoundary>
    );
};

export default AIPage; 