import React from 'react';
import LoadingScreen from '../components/common/LoadingScreen';

const SplashScreen = () => {
    return (
        <LoadingScreen
            title="BloodReach"
            tagline={null}
            logoBoxStyle={{ width: 100, height: 100 }}
            logoStyle={{ width: 100, height: 100 }}
            titleStyle={{ fontSize: 35, fontWeight: 'bold', color: '#000000ff', marginTop: 10, letterSpacing: -0.5 }}
        />
    );
};

export default SplashScreen;


