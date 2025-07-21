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
    // Interlinked (WAF) view color coding
    if (viewType === 'waf' || nodeType === 'acl' || nodeType === 'cdn-waf' || nodeType === 'alb' || nodeType === 'alb-waf') {
        if (action === 'Block') {
            return {
                width: diameter,
                height: diameter,
                borderRadius: '50%',
                background: '#d32f2f',
                border: '3px solid #b71c1c',
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
        if (nodeType === 'acl' || nodeType === 'cdn-waf') {
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
        if (nodeType === 'alb' || nodeType === 'alb-waf') {
            return {
                width: diameter,
                height: diameter,
                borderRadius: '50%',
                background: '#43a047',
                border: '3px solid #2e7d32',
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
        nodeStyle.background = darkTheme ? '#319177' : '#319177'; // blue
        nodeStyle.border = `3px solid ${darkTheme ? '#319177' : '#319177'}`;
    } else if (!isParent && isChild) {
        nodeStyle.background = darkTheme ? '#007fff' : '#007fff'; // green
        nodeStyle.border = `3px solid ${darkTheme ? '#007fff' : '#007fff'}`;
    } else if (isParent && isChild) {
        nodeStyle.background = darkTheme ? '#7851a9' : '#7851a9'; // light sea green
        nodeStyle.border = `3px solid ${darkTheme ? '#7851a9' : '#7851a9'}`;
    } else {
        nodeStyle.background = darkTheme ? '#757575' : '#bdbdbd'; // gray
        nodeStyle.border = `3px solid ${darkTheme ? '#bdbdbd' : '#757575'}`;
    }
    // Then override only the border color for ALB rule and ACL
    if (nodeType === 'acl' || nodeType === 'wafrule') {
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
            <Tooltip title={iconTooltip} arrow>
                <span>{icon}</span>
            </Tooltip>
            {/* Action indicator - tiny round-edged rectangle under the arrow symbol */}
            {data.action && (
                <div style={{
                    position: 'absolute',
                    top: 35,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 16,
                    height: 6,
                    backgroundColor: data.action.toLowerCase() === 'allow' ? '#0072b2' : 
                                   data.action.toLowerCase() === 'block' ? '#dc143c' :
                                   data.action.toLowerCase() === 'count' ? '#faa500' : '#ff6b6b',
                    borderRadius: 3,
                    border: `1px solid ${data.action.toLowerCase() === 'allow' ? '#0072b2' : 
                                       data.action.toLowerCase() === 'block' ? '#dc143c' :
                                       data.action.toLowerCase() === 'count' ? '#faa500' : '#ff6b6b'}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    zIndex: 10
                }} />
            )}
            {/* When rendering label/header names inside nodes, use the color and bold style as described above. */}
            <Tooltip title={data.Name || data.name} arrow>
                <div style={{ fontWeight: 'bold', fontSize: 18, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: '#fff', textShadow: darkTheme ? '0 1px 2px rgba(0,0,0,0.5)' : 'none', marginTop: 4 }}>{data.Name || data.name}</div>
            </Tooltip>
            {/* Action and count/priority below name */}
            <div style={{ fontSize: 14, color: '#e0e0e0', marginTop: 4, textAlign: 'center', fontWeight: 500 }}>
                {data.action && <span style={{ marginRight: 4 }}>{data.action}</span>}
                {(data.Priority !== undefined || data.priority !== undefined) && <span>| {data.Priority ?? data.priority}</span>}
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