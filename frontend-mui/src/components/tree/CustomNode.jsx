import React from 'react';
import { Handle, Position } from 'reactflow';
import { useThemeContext } from '../../context/ThemeContext';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BlockIcon from '@mui/icons-material/Block';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Tooltip from '@mui/material/Tooltip';
import ReactDOM from 'react-dom';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

const getNodeStyle = (action, diameter, isParent, isChild, darkTheme, isFaded, nodeType, viewType) => {
    // Softer colors for interlinked (combined) view
    if (viewType === 'waf' && (nodeType === 'acl' || nodeType === 'alb')) {
        return {
            width: diameter,
            height: diameter,
            borderRadius: '50%',
            background: nodeType === 'acl' ? '#376fa3' : '#ffb347', // deeper blue for ACL, deeper orange for ALB
            border: nodeType === 'acl' ? '3px solid #376fa3' : '3px solid #ffb347',
            color: '#222',
            fontWeight: 'bold',
            boxShadow: darkTheme ? '0 4px 6px rgba(0, 0, 0, 0.2)' : '0 4px 6px rgba(56, 57, 59, 0.1)',
            opacity: isFaded ? 0.3 : 1,
            outline: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 0,
            transition: 'all 0.3s ease',
        };
    }
    // Only use default blue style for WAF view, not CDN-WAF
    if (viewType === 'waf' || nodeType === 'cdn-waf' || nodeType === 'alb' || nodeType === 'alb-waf') {
        return {
            width: diameter,
            height: diameter,
            borderRadius: '50%',
            background: '#1976d2',
            border: '3px solid #1565c0',
            color: '#fff',
            fontWeight: 'bold',
            boxShadow: darkTheme ? '0 4px 6px rgba(0, 0, 0, 0.4)' : '0 4px 6px rgba(56, 57, 59, 0.3)',
            opacity: isFaded ? 0.3 : 1,
            outline: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 0,
            transition: 'all 0.3s ease',
        };
    }
    const nodeStyle = {
        width: diameter,
        height: diameter,
        borderRadius: '50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#fff',
        boxShadow: darkTheme 
            ? '0 4px 6px rgba(0, 0, 0, 0.4)' 
            : '0 4px 6px rgba(56, 57, 59, 0.3)',
        border: `3px solid ${darkTheme ? '#444' : 'rgb(23, 26, 23)'}`,
        textAlign: 'center',
        padding: 0,
        position: 'relative',
        background: darkTheme ? '#2f4f4f' : '#2f4f4f',
        transition: 'all 0.3s ease',
        opacity: isFaded ? 0.3 : 1,
        outline: 'none',
    };
    // Original background and border logic
    if (isParent && !isChild) {
        nodeStyle.background = darkTheme ? '#319177' : '#319177'; // green
        nodeStyle.border = `3px solid ${darkTheme ? '#319177' : '#319177'}`;
    } else if (!isParent && isChild) {
        nodeStyle.background = darkTheme ? '#007fff' : '#007fff'; // blue
        nodeStyle.border = `3px solid ${darkTheme ? '#007fff' : '#007fff'}`;
    } else if (isParent && isChild) {
        nodeStyle.background = darkTheme ? '#7851a9' : '#7851a9'; // purple
        nodeStyle.border = `3px solid ${darkTheme ? '#7851a9' : '#7851a9'}`;
    } else {
        nodeStyle.background = darkTheme ? '#757575' : '#bdbdbd'; // gray
        nodeStyle.border = `3px solid ${darkTheme ? '#bdbdbd' : '#757575'}`;
    }
    // Then override only the border color for ALB rule and ACL (but not in CDN-WAF view)
    if ((nodeType === 'acl' && viewType !== 'cdn-waf') || nodeType === 'wafrule') {
        nodeStyle.border = '3px solid #e75480'; // pink
    } else if (nodeType === 'albrule') {
        nodeStyle.border = '3px solid orange';
    }
    return nodeStyle;
};

export default function CustomNode({ data, id, selected, isFaded }) {
    const { darkTheme } = useThemeContext();
    const diameter = 120;
    const isParent = data.isParent;
    const isChild = data.isChild;
    const displayName = data.name && data.name.length > 8 ? data.name.slice(0, 8) + '\u2026' : data.name;
    
    // Remove console.log statements
    const handleIds = {
      source: `${id}-source`,
      target: `${id}-target`,
    };

    const nodeStyle = getNodeStyle(data.action, diameter, isParent, isChild, darkTheme, isFaded, data.nodeType, data.viewType);
    if (selected) {
        nodeStyle.boxShadow = darkTheme 
            ? '0 0 0 2px #fff, 0 4px 6px rgba(0, 0, 0, 0.4)' 
            : '0 0 0 2px #000, 0 4px 6px rgba(56, 57, 59, 0.3)';
    }
    // Icon logic
    let icon = <FiberManualRecordIcon fontSize="small" aria-label="Other" />;
    let iconTooltip = 'Other';
    if (isParent && isChild) {
        icon = <CompareArrowsIcon fontSize="small" aria-label="Parent & Child" />;
        iconTooltip = 'Parent & Child';
    } else if (isParent) {
        icon = <ArrowUpwardIcon fontSize="small" aria-label="Parent" />;
        iconTooltip = 'Parent';
    } else if (isChild) {
        icon = <ArrowDownwardIcon fontSize="small" aria-label="Child" />;
        iconTooltip = 'Child';
    }
    return (
        <div
            style={nodeStyle}
            tabIndex={0}
            aria-label={iconTooltip + ' node: ' + (data.Name || data.name)}
            role="button"
        >
            <Handle 
                type="target" 
                position={Position.Top} 
                id={`target-${id}`} 
                style={{ 
                    opacity: 0,
                    background: darkTheme ? '#fff' : '#000'
                }} 
            />
            {/* Icon and action rectangle in a flex column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '100%' }}>
                <Tooltip title={iconTooltip} arrow>
                    <span>{icon}</span>
                </Tooltip>
                {/* Color-coded action rectangle for ACL, ALB, and Interlinked nodes */}
                {((data.viewType === 'waf' || data.viewType === 'cdn-waf' || data.nodeType === 'acl' || data.nodeType === 'wafrule' || data.nodeType === 'alb' || data.nodeType === 'albrule' || data.borderColor === '#e75480') && data.action) && (
                    <div style={{
                        marginTop: 0,
                        marginBottom: 0,
                        width: 28,
                        height: 10,
                        backgroundColor: data.action.toLowerCase() === 'allow' ? '#43a047' :
                                        data.action.toLowerCase() === 'block' ? '#d32f2f' :
                                        data.action.toLowerCase() === 'count' ? '#faa500' : '#bdbdbd',
                        borderRadius: 4,
                        border: `2px solid ${data.action.toLowerCase() === 'allow' ? '#388e3c' :
                                            data.action.toLowerCase() === 'block' ? '#b71c1c' :
                                            data.action.toLowerCase() === 'count' ? '#faa500' : '#888'}`,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                        zIndex: 10,
                        display: 'block',
                    }} />
                )}
            </div>
            <Tooltip title={data.Name || data.name} arrow>
                <div style={{ fontWeight: 'bold', fontSize: 18, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: '#fff', textShadow: darkTheme ? '0 1px 2px rgba(0,0,0,0.5)' : 'none', marginTop: 4 }}>{data.Name || data.name}</div>
            </Tooltip>
            {/* Metric name below rule name */}
            {data.metric && (
                <div style={{ fontSize: 12, color: '#fff', textAlign: 'center', marginTop: 2, marginBottom: 2, fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                    {data.metric}
                </div>
            )}
            {/* Action and count/priority below name */}
            <div style={{ fontSize: 14, color: '#e0e0e0', marginTop: 4, marginBottom: 8, textAlign: 'center', fontWeight: 500 }}>
                {(data.Priority !== undefined || data.priority !== undefined) && <span>Priority: {data.Priority ?? data.priority}</span>}
            </div>
            <Handle 
                type="source" 
                position={Position.Bottom} 
                id={`source-${id}`} 
                style={{ 
                    opacity: 0,
                    background: darkTheme ? '#fff' : '#000'
                }} 
            />
        </div>
    );
} 