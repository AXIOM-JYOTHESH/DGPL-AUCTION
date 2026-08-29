import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./authContextCore";

const SocketContext = createContext({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext); // eslint-disable-line react-refresh/only-export-components

const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [socketInstance, setSocketInstance] = useState(null); // force re-render when (re)created
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (socketRef.current) {
      try {
        console.log(
          "[SocketProvider] Disconnecting previous socket id",
          socketRef.current.id
        );
        socketRef.current.disconnect();
      } catch {
        // ignore previous disconnect errors
      }
    }

    const options = {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
    };
    if (token) options.auth = { token };

    const socket = io(import.meta.env.VITE_API_URL, options);
    socketRef.current = socket;
    setSocketInstance(socket); // trigger context update immediately
    console.log("[SocketProvider] Created socket instance");

    const handleConnect = () => {
      console.log("[SocketProvider] Connected socket id", socket.id);
      setIsConnected(true);
    };
    const handleDisconnect = (reason) => {
      console.log(
        "[SocketProvider] Disconnected socket id",
        socket.id,
        "reason:",
        reason
      );
      setIsConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      try {
        socket.disconnect();
      } catch {
        /* ignore disconnect cleanup error */
      }
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket: socketInstance, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
// Also attach hook as a static for backward compatibility
SocketProvider.useSocket = useSocket;
