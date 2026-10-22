import React, { useState, useRef, useEffect } from 'react';
import { getServiceSuggestions, ServiceSuggestion } from '../../utils/serviceSuggestions';
import { ServiceItem, ClientService } from '../../types';
import { Sparkles, Layers, Briefcase, ChevronRight } from 'lucide-react';
import { formatINR } from '../../utils/indianNumbering';

interface ServiceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion: (suggestion: ServiceSuggestion) => void;
  catalogServices?: ServiceItem[];
  clientServices?: ClientService[];
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const ServiceAutocompleteComponent: React.FC<ServiceAutocompleteProps> = ({
  value,
  onChange,
  onSelectSuggestion,
  catalogServices = [],
  clientServices = [],
  placeholder = 'Type service name or select suggestion...',
  className = '',
  autoFocus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = React.useMemo(
    () => getServiceSuggestions(value, catalogServices, clientServices),
    [value, catalogServices, clientServices]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSelect = (item: ServiceSuggestion) => {
    onChange(item.name);
    onSelectSuggestion(item);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const getSourceBadge = (source: ServiceSuggestion['source']) => {
    switch (source) {
      case 'client':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
            <Briefcase className="w-2.5 h-2.5" /> Client Preset
          </span>
        );
      case 'catalog':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#C6A15B] bg-[#F7F4EC] border border-[#C6A15B]/30 px-1.5 py-0.5 rounded-md">
            <Layers className="w-2.5 h-2.5" /> Catalog
          </span>
        );
      case 'agency':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md">
            <Sparkles className="w-2.5 h-2.5" /> Common Service
          </span>
        );
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={className}
          autoComplete="off"
        />
        {suggestions.length > 0 && !isOpen && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setIsOpen(true)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#C6A15B] transition-colors"
            title="View Suggestions"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-gray-100 animate-in fade-in zoom-in-95">
          <div className="px-3 py-1.5 bg-gray-50/80 text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
            <span>Suggestions ({suggestions.length})</span>
            <span className="text-[9px] text-gray-400">↑↓ to navigate • ↵ to pick</span>
          </div>

          {suggestions.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <button
                key={`${item.source}-${item.name}-${idx}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before click
                  handleSelect(item);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-start justify-between gap-3 ${
                  isHighlighted ? 'bg-[#F2ECE1] text-[#1A1B1E]' : 'hover:bg-gray-50 text-gray-800'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-[#1A1B1E] truncate">{item.name}</span>
                    {getSourceBadge(item.source)}
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-gray-500 line-clamp-1 truncate">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  {item.defaultRate > 0 && (
                    <span className="font-medium text-[#C6A15B] text-xs">
                      {formatINR(item.defaultRate)}
                    </span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 ml-auto mt-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ServiceAutocomplete = React.memo(ServiceAutocompleteComponent);
