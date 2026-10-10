import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AutocompleteLocationInput = ({ value, onChange, placeholder, required = false, iconColor = "text-moss-500" }) => {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  // Sync external value changes (e.g. from voice agent)
  useEffect(() => {
    if (value !== query) {
      setQuery(value || '');
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      if (!query || query.length < 3) {
        setSuggestions([]);
        return;
      }
      
      // Don't search if the query is exactly what we just selected
      if (suggestions.some(s => s.display_name === query)) return;

      setLoading(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`, {
          headers: {
            'Accept-Language': 'en'
          }
        });
        const data = await response.json();
        setSuggestions(data || []);
        setIsOpen(true);
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchLocations();
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (location) => {
    setQuery(location.display_name);
    setSuggestions([]);
    setIsOpen(false);
    onChange(location.display_name); // Call parent onChange with the full address
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val); // Always keep parent in sync with raw typed value
    if (val.length > 2) setIsOpen(true);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${iconColor}`} />
      <input 
        required={required} 
        value={query} 
        onChange={handleInputChange} 
        onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
        type="text" 
        className="input-field pl-12 pr-10" 
        placeholder={placeholder} 
        autoComplete="off"
      />
      {loading && (
        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-loft-400 animate-spin" />
      )}

      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-full left-0 right-0 mt-2 bg-loft-900 border border-loft-700 rounded-xl shadow-xl overflow-hidden z-50"
          >
            {suggestions.map((loc, idx) => (
              <button
                key={loc.place_id || idx}
                type="button"
                onClick={() => handleSelect(loc)}
                className="w-full text-left px-4 py-3 hover:bg-loft-800 transition-colors flex items-start gap-3 border-b border-loft-800 last:border-b-0"
              >
                <Search className="w-4 h-4 text-loft-400 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-loft-50 line-clamp-1">{loc.display_name.split(',')[0]}</div>
                  <div className="text-xs text-loft-400 line-clamp-1">{loc.display_name.split(',').slice(1).join(',')}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AutocompleteLocationInput;
