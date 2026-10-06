import { createContext, useContext, useState } from "react";
import { simpananSesi } from "@/lib/simpananAman";

const ViewAsContext = createContext(null);

const SESSION_KEY = "current_view_as_role";
const SESSION_LABEL_KEY = "current_view_as_label";
const SESSION_EMAIL_KEY = "current_view_as_user_email";
const SESSION_TESTSAVE_KEY = "current_view_as_test_save";

export function ViewAsProvider({ children }) {
  const [viewAsRole, setViewAsRole] = useState(() => simpananSesi.baca(SESSION_KEY) || null);
  const [viewAsLabel, setViewAsLabel] = useState(() => simpananSesi.baca(SESSION_LABEL_KEY) || "");
  const [viewAsUserEmail, setViewAsUserEmail] = useState(() => simpananSesi.baca(SESSION_EMAIL_KEY) || null);
  const [testSaveMode, setTestSaveMode] = useState(() => simpananSesi.baca(SESSION_TESTSAVE_KEY) === "true");

  const activateViewAs = (role, label, userEmail = null, { testSave = false } = {}) => {
    if (!role || role === "owner") {
      resetViewAs();
      return;
    }
    setViewAsRole(role);
    setViewAsLabel(label);
    setViewAsUserEmail(userEmail);
    setTestSaveMode(testSave);
    simpananSesi.tulis(SESSION_KEY, role);
    simpananSesi.tulis(SESSION_LABEL_KEY, label);
    if (userEmail) simpananSesi.tulis(SESSION_EMAIL_KEY, userEmail);
    else simpananSesi.hapus(SESSION_EMAIL_KEY);
    if (testSave) simpananSesi.tulis(SESSION_TESTSAVE_KEY, "true");
    else simpananSesi.hapus(SESSION_TESTSAVE_KEY);
  };

  const resetViewAs = () => {
    setViewAsRole(null);
    setViewAsLabel("");
    setViewAsUserEmail(null);
    setTestSaveMode(false);
    simpananSesi.hapus(SESSION_KEY);
    simpananSesi.hapus(SESSION_LABEL_KEY);
    simpananSesi.hapus(SESSION_EMAIL_KEY);
    simpananSesi.hapus(SESSION_TESTSAVE_KEY);
  };

  const isViewingAs = !!viewAsRole;

  return (
    <ViewAsContext.Provider value={{ viewAsRole, viewAsLabel, viewAsUserEmail, testSaveMode, isViewingAs, activateViewAs, resetViewAs }}>
      {children}
    </ViewAsContext.Provider>
  );
}

/*
 * Nilai bawaan, bukan null.
 *
 * Seluruh pemakai hook ini membongkar hasilnya langsung
 * (`const { viewAsRole } = useViewAs()`), dan membongkar null melempar
 * TypeError yang mematikan halaman — bukan menampilkan pesan, benar-benar
 * halaman kosong. Di aplikasi penyedianya selalu ada di AppLayout, tetapi
 * "selalu" yang bergantung pada susunan komponen bukan jaminan: satu
 * halaman yang dirender di luar AppLayout sudah cukup.
 */
const TANPA_PENYEDIA = Object.freeze({
  viewAsRole: null,
  viewAsLabel: "",
  viewAsUserEmail: "",
  testSaveMode: false,
  isViewingAs: false,
  activateViewAs: () => {},
  resetViewAs: () => {},
});

export function useViewAs() {
  return useContext(ViewAsContext) || TANPA_PENYEDIA;
}