import { createContext, useContext, useState } from 'react';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [lectureContext, setLectureContext] = useState(null);
  return (
    <ChatContext.Provider value={{ lectureContext, setLectureContext }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChatContext = () => useContext(ChatContext);
