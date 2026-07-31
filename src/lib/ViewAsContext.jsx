import { createContext, useContext, useState } from "react";

const ViewAsContext = createContext(null);

const SESSION_KEY = "current_view_as_role";
const SESSION_LABEL_KEY = "current_view_as_label";
const SESSION_EMAIL_KEY = "current_view_as_user_email";
const SESSION_TESTSAVE_KEY = "current_view_as_test_save";

export function ViewAsProvider({ children }) {
  const [viewAsRole, setViewAsRole] = useState(() => sessionStorage.getItem(SESSION_KEY) || null);
  const [viewAsLabel, setViewAsLabel] = useState(() => sessionStorage.getItem(SESSION_LABEL_KEY) || "");
  const [viewAsUserEmail, setViewAsUserEmail] = useState(() => sessionStorage.getItem(SESSION_EMAIL_KEY) || null);
  const [testSaveMode, setTestSaveMode] = useState(() => sessionStorage.getItem(SESSION_TESTSAVE_KEY) === "true");

  const activateViewAs = (role, label, userEmail = null, { testSave = false } = {}) => {
    if (!role || role === "owner") {
      resetViewAs();
      return;
    }
    setViewAsRole(role);
    setViewAsLabel(label);
    setViewAsUserEmail(userEmail);
    setTestSaveMode(testSave);
    sessionStorage.setItem(SESSION_KEY, role);
    sessionStorage.setItem(SESSION_LABEL_KEY, label);
    if (userEmail) sessionStorage.setItem(SESSION_EMAIL_KEY, userEmail);
    else sessionStorage.removeItem(SESSION_EMAIL_KEY);
    if (testSave) sessionStorage.setItem(SESSION_TESTSAVE_KEY, "true");
    else sessionStorage.removeItem(SESSION_TESTSAVE_KEY);
  };

  const resetViewAs = () => {
    setViewAsRole(null);
    setViewAsLabel("");
    setViewAsUserEmail(null);
    setTestSaveMode(false);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_LABEL_KEY);
    sessionStorage.removeItem(SESSION_EMAIL_KEY);
    sessionStorage.removeItem(SESSION_TESTSAVE_KEY);
  };

  const isViewingAs = !!viewAsRole;

  return (
    <ViewAsContext.Provider value={{ viewAsRole, viewAsLabel, viewAsUserEmail, testSaveMode, isViewingAs, activateViewAs, resetViewAs }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  return useContext(ViewAsContext);
}