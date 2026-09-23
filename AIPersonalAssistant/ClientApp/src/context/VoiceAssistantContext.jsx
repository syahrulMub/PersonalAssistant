import React, { createContext, useContext, useState, useCallback } from "react";

const VoiceAssistantContext = createContext(null);

export const VoiceAssistantProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openAssistant = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <VoiceAssistantContext.Provider
      value={{
        isOpen,
        openAssistant,
        closeAssistant,
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
};

export const useVoiceAssistant = () => {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    throw new Error(
      "useVoiceAssistant must be used within a VoiceAssistantProvider",
    );
  }
  return context;
};

export default VoiceAssistantContext;
