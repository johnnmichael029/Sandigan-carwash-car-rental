import React, { useState, useEffect } from 'react';
import searchIcon from '../../../assets/icon/search.png';

const SharedSearchBar = ({ 
    searchTerm, 
    onSearchChange, 
    placeholder = "Search...", 
    width = "220px",
    onDebouncedSearch = null,
    debounceDelay = 400
}) => {
    // Keep local state for responsive typing
    const [localValue, setLocalValue] = useState(searchTerm || '');

    // Sync if parent updates value directly (e.g. clear all)
    useEffect(() => {
        if (searchTerm !== undefined && searchTerm !== localValue) {
            setLocalValue(searchTerm || '');
        }
    }, [searchTerm]);

    // Apply strict debounce for server calls if onDebouncedSearch is provided
    useEffect(() => {
        if (!onDebouncedSearch) return;
        const handler = setTimeout(() => {
            onDebouncedSearch(localValue);
        }, debounceDelay);
        return () => clearTimeout(handler);
    }, [localValue, debounceDelay]); // Removed onDebouncedSearch from deps so it doesn't trigger unexpectedly

    const handleChange = (e) => {
        const val = e.target.value;
        setLocalValue(val);
        if (onSearchChange) onSearchChange(val);
    };

    const handleClear = () => {
        setLocalValue('');
        if (onSearchChange) onSearchChange('');
        if (onDebouncedSearch) onDebouncedSearch('');
    };

    return (
        <div className="d-flex align-items-center shadow-none border rounded-pill overflow-hidden bg-white">
            <span className="input-group-text bg-transparent border-0">
                <img src={searchIcon} alt="Search Icon" style={{ width: '16px' }} />
            </span>
            <input
                type="text"
                className="form-control border-0 bg-transparent shadow-none font-poppins ps-0"
                placeholder={placeholder}
                style={{ fontSize: '0.8rem', width: width }}
                value={localValue}
                onChange={handleChange}
            />
            {localValue && (
                <button
                    className="btn btn-link text-danger p-0 pe-3 border-0 shadow-none text-decoration-none"
                    onClick={handleClear}
                    style={{ fontSize: '1.2rem', lineHeight: 1 }}
                    type="button"
                >
                    &times;
                </button>
            )}
        </div>
    );
};

export default SharedSearchBar;
