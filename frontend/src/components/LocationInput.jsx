import React, { useState, useEffect, useRef } from "react";

export default function LocationInput({ label, value, onChange, placeholder, icon: Icon, iconColor }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!value || value.length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5`,
          {
            headers: {
              "User-Agent": "SpotterHOSApp/1.0 (contact: support@spotterhos.com)",
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          // Extract a nice readable name
          setSuggestions(data.map((item) => item.display_name));
        }
      } catch (err) {
        console.error("Suggestions fetch error:", err);
      } finally {
        setLoading(false);
      }
    }, 600); // 600ms debounce to avoid spamming Nominatim

    return () => clearTimeout(delayDebounce);
  }, [value]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <label>{label}</label>
      <div style={{ position: "relative" }}>
        {Icon && <Icon size={16} color={iconColor} style={{ position: "absolute", left: "12px", top: "12px" }} />}
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          style={{ paddingLeft: Icon ? "2.5rem" : "1rem" }}
          placeholder={placeholder}
          required
        />
      </div>

      {showSuggestions && (suggestions.length > 0 || loading) && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "#1e293b",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            margin: "4px 0 0 0",
            padding: "0.25rem 0",
            listStyle: "none",
            zIndex: 1000,
            maxHeight: "200px",
            overflowY: "auto",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)",
          }}
        >
          {loading ? (
            <li style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", color: "#94a3b8" }}>Searching...</li>
          ) : (
            suggestions.map((sug, idx) => (
              <li
                key={idx}
                onClick={() => {
                  onChange(sug);
                  setShowSuggestions(false);
                }}
                className="suggestion-item"
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.85rem",
                  color: "#f8fafc",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {sug}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
