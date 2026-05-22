import { createContext, useContext, useState } from "react";

const ViewAsContext = createContext(null);

export function ViewAsProvider({ children }) {
  const [viewAsRole, setViewAsRole] = useState(null); // null = real role
  const [viewAsLabel, setViewAsLabel] = useState("");

  const activateViewAs = (role, label) => {
    setViewAsRole(role);
    setViewAsLabel(label);
  };

  const resetViewAs = () => {
    setViewAsRole(null);
    setViewAsLabel("");
  };

  return (
    <ViewAsContext.Provider value={{ viewAsRole, viewAsLabel, activateViewAs, resetViewAs }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  return useContext(ViewAsContext);
}