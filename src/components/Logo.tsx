import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../theme/colors';

interface LogoProps {
    size?: number;
}

export const Logo: React.FC<LogoProps> = ({ size = 150 }) => {
    return (
        <Svg width={size} height={size * 1.4} viewBox="0 0 100 140">
            {/* Teardrop Shape */}
            <Path
                d="M50 0C50 0 0 50 0 95C0 120 22.4 140 50 140C77.6 140 100 120 100 95C100 50 50 0 50 0Z"
                fill={Colors.white}
            />

            {/* Heart Shape */}
            <Path
                d="M50 70C50 70 47 67 43 67C38 67 35 71 35 76C35 83 43 90 50 97C57 90 65 83 65 76C65 71 62 67 57 67C53 67 50 70 50 70Z"
                fill={Colors.primary}
            />

            {/* Curved line below heart - following teardrop bottom curve */}
            <Path
                d="M35 105C40 108 45 110 50 110C55 110 60 108 65 105"
                stroke={Colors.primary}
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
            />
        </Svg>
    );
};
