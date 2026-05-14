import Badge from '../common/Badge';
import React from 'react';

interface StatusBadgeProps {
    status: string;
}

const StatusBadge = React.memo(({ status }: StatusBadgeProps) => {
    let bgColor = '#F1F5F9';
    let textColor = '#64748B';
    let icon = undefined;

    if (status === 'EMERGENCY') {
        bgColor = '#FEE2E2';
        textColor = '#B62022';
        icon = 'emergency';
    } else if (status === 'WAITING') {
        bgColor = '#FFEDD5';
        textColor = '#D97706';
    } else if (status === 'MATCHED') {
        bgColor = '#DCFCE7';
        textColor = '#16A34A';
    } else if (status === 'CLOSED') {
        bgColor = '#E2E8F0';
        textColor = '#64748B';
    }

    return (
        <Badge
            label={status}
            icon={icon}
            bgColor={bgColor}
            textColor={textColor}
        />
    );
});

export default StatusBadge;

