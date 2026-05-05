import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomModal from '../components/CustomModal';

interface ModalOptions {
    title: string;
    description: string;
    type?: 'info' | 'success' | 'error' | 'warning' | 'danger';
    primaryText?: string;
    onPrimaryPress?: () => void;
    secondaryText?: string;
    onSecondaryPress?: () => void;
    icon?: string;
}

interface ModalContextType {
    showModal: (options: ModalOptions) => void;
    hideModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [visible, setVisible] = useState(false);
    const [options, setOptions] = useState<ModalOptions | null>(null);

    const showModal = useCallback((newOptions: ModalOptions) => {
        setOptions(newOptions);
        setVisible(true);
    }, []);

    const hideModal = useCallback(() => {
        setVisible(false);
    }, []);

    const handlePrimaryPress = () => {
        hideModal();
        if (options?.onPrimaryPress) {
            options.onPrimaryPress();
        }
    };

    const handleSecondaryPress = () => {
        hideModal();
        if (options?.onSecondaryPress) {
            options.onSecondaryPress();
        }
    };

    return (
        <ModalContext.Provider value={{ showModal, hideModal }}>
            {children}
            {options && (
                <CustomModal
                    visible={visible}
                    onClose={hideModal}
                    title={options.title}
                    description={options.description}
                    type={options.type}
                    primaryText={options.primaryText}
                    onPrimaryPress={handlePrimaryPress}
                    secondaryText={options.secondaryText}
                    onSecondaryPress={handleSecondaryPress}
                    icon={options.icon}
                />
            )}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};
