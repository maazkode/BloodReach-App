import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface TimelineProps {
    status: string;
}

const Timeline = React.memo(({ status }: TimelineProps) => {
    const step = status === 'completed' ? 3 : status === 'matched' ? 2 : 1;
    
    return (
        <View style={styles.timelineContainer}>
            <View style={styles.timelineLineBg} />
            <View style={[styles.timelineLineActive, { width: step === 1 ? '15%' : step === 2 ? '50%' : '100%' }]} />
            <View style={styles.timelineSteps}>
                <View style={styles.timelineStep}>
                    <View style={[styles.timelineDot, step >= 1 && styles.timelineDotActive]}>
                        <MaterialIcon name="check" size={14} color="#fff" />
                    </View>
                    <Text style={[styles.timelineText, step >= 1 && styles.timelineTextActive]}>Created</Text>
                </View>
                <View style={styles.timelineStep}>
                    <View style={[styles.timelineDot, step >= 2 && styles.timelineDotActive]}>
                        {step >= 2 && <MaterialIcon name="check" size={14} color="#fff" />}
                    </View>
                    <Text style={[styles.timelineText, step >= 2 && styles.timelineTextActive]}>Matched</Text>
                </View>
                <View style={styles.timelineStep}>
                    <View style={[styles.timelineDot, step >= 3 && styles.timelineDotActive]}>
                        {step >= 3 && <MaterialIcon name="check" size={14} color="#fff" />}
                    </View>
                    <Text style={[styles.timelineText, step >= 3 && styles.timelineTextActive]}>Fulfilled</Text>
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    timelineContainer: { marginBottom: 30, marginTop: 10, position: 'relative' },
    timelineLineBg: { position: 'absolute', top: 12, left: 20, right: 20, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2 },
    timelineLineActive: { position: 'absolute', top: 12, left: 20, height: 4, backgroundColor: '#B62022', borderRadius: 2 },
    timelineSteps: { flexDirection: 'row', justifyContent: 'space-between' },
    timelineStep: { alignItems: 'center', width: 60 },
    timelineDot: { 
        width: 28, 
        height: 28, 
        borderRadius: 14, 
        backgroundColor: '#E2E8F0', 
        justifyContent: 'center', 
        alignItems: 'center', 
        borderWidth: 3, 
        borderColor: '#F8FAFC' 
    },
    timelineDotActive: { backgroundColor: '#B62022' },
    timelineText: { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginTop: 6 },
    timelineTextActive: { color: '#1E293B', fontWeight: '800' },
});

export default Timeline;
