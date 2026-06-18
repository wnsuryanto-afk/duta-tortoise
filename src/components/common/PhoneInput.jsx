/**
 * PhoneInput — Input nomor HP dengan normalisasi otomatis dan validasi.
 * Simpan format "628xxx", tampilkan "08xxx" untuk keterbacaan.
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { normalizePhone } from "@/lib/normalizePhone";

export default function PhoneInput({ value, onChange, placeholder = "08123456789", className = "", ...props }) {
  // Tampilkan dalam format 08xxx, simpan 62xxx
  const displayValue = value
    ? (value.startsWith("62") ? "0" + value.slice(2) : value)
    : "";

  const [inputVal, setInputVal] = useState(displayValue);
  const [error, setError] = useState("");

  // Sync when external value changes
  const externalDisplay = value
    ? (value.startsWith("62") ? "0" + value.slice(2) : value)
    : "";

  const handleChange = (e) => {
    setInputVal(e.target.value);
    setError("");
  };

  const handleBlur = () => {
    if (!inputVal) {
      setError("");
      onChange?.("");
      return;
    }
    const { normalized, isValid } = normalizePhone(inputVal);
    if (!isValid) {
      setError("Nomor tidak valid (10-15 digit)");
    } else {
      setError("");
      setInputVal("0" + normalized.slice(2)); // tampilkan 08xxx
      onChange?.(normalized); // simpan 628xxx
    }
  };

  return (
    <div className="space-y-1">
      <Input
        type="tel"
        value={inputVal !== externalDisplay ? inputVal : externalDisplay}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`${className} ${error ? "border-red-400 bg-red-50" : ""}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}