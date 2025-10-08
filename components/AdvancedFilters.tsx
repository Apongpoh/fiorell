// components/AdvancedFilters.tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X, ChevronDown, Check } from "lucide-react";
import Button from "./ui/Button";
import PremiumFeatureGate from "./PremiumFeatureGate";
import { useToast } from "./ui/Toast";

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  initialFilters?: FilterOptions;
}

export interface FilterOptions {
  ageRange: { min: number; max: number };
  distance: number;
  height: { min: number; max: number };
  education: string[];
  lifestyle: {
    smoking: string[];
    drinking: string[];
    exercise: string[];
    diet: string[];
  };
  interests: string[];
  dealBreakers: {
    mustHavePhotos: boolean;
    verifiedOnly: boolean;
    noSmoking: boolean;
    similarAge: boolean;
  };
}

const defaultFilters: FilterOptions = {
  ageRange: { min: 18, max: 99 },
  distance: 50,
  height: { min: 150, max: 220 },
  education: [],
  lifestyle: {
    smoking: [],
    drinking: [],
    exercise: [],
    diet: []
  },
  interests: [],
  dealBreakers: {
    mustHavePhotos: false,
    verifiedOnly: false,
    noSmoking: false,
    similarAge: false
  }
};

const educationOptions = [
  "High School",
  "Some College",
  "Bachelor's Degree",
  "Master's Degree",
  "PhD/Doctorate",
  "Trade School",
  "Other"
];

const lifestyleOptions = {
  smoking: ["Never", "Occasionally", "Regularly"],
  drinking: ["Never", "Socially", "Regularly"],
  exercise: ["Never", "Sometimes", "Regularly", "Daily"],
  diet: ["No Preference", "Vegetarian", "Vegan", "Keto", "Paleo"]
};

const popularInterests = [
  "Travel", "Photography", "Music", "Movies", "Reading", "Cooking",
  "Fitness", "Hiking", "Art", "Dancing", "Gaming", "Sports",
  "Technology", "Fashion", "Food", "Nature", "Pets", "Yoga"
];

export default function AdvancedFilters({
  isOpen,
  onClose,
  onApply,
  initialFilters = defaultFilters
}: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const { showToast } = useToast();

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const handleApply = () => {
    onApply(filters);
    showToast({
      type: "success",
      title: "Filters Applied",
      message: "Your advanced filters have been updated successfully."
    });
    onClose();
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    showToast({
      type: "info",
      title: "Filters Reset",
      message: "All filters have been reset to default values."
    });
  };

  if (!isOpen) return null;

  return (
    <PremiumFeatureGate feature="advancedFilters">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Filter className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Advanced Filters</h2>
                    <p className="text-blue-100 text-sm">
                      Find exactly who you&apos;re looking for
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-96">
              <div className="space-y-6">
                {/* Age Range */}
                <FilterSection title="Age Range">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-600 mb-1">Min Age</label>
                      <input
                        type="range"
                        min="18"
                        max="99"
                        value={filters.ageRange.min}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          ageRange: { ...prev.ageRange, min: parseInt(e.target.value) }
                        }))}
                        className="w-full"
                      />
                      <span className="text-sm font-semibold">{filters.ageRange.min}</span>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm text-gray-600 mb-1">Max Age</label>
                      <input
                        type="range"
                        min="18"
                        max="99"
                        value={filters.ageRange.max}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          ageRange: { ...prev.ageRange, max: parseInt(e.target.value) }
                        }))}
                        className="w-full"
                      />
                      <span className="text-sm font-semibold">{filters.ageRange.max}</span>
                    </div>
                  </div>
                </FilterSection>

                {/* Distance */}
                <FilterSection title="Distance">
                  <div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={filters.distance}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        distance: parseInt(e.target.value)
                      }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>1 km</span>
                      <span className="font-semibold">{filters.distance} km</span>
                      <span>100 km</span>
                    </div>
                  </div>
                </FilterSection>

                {/* Height Range */}
                <FilterSection title="Height Range">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-600 mb-1">Min Height</label>
                      <input
                        type="range"
                        min="150"
                        max="220"
                        value={filters.height.min}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          height: { ...prev.height, min: parseInt(e.target.value) }
                        }))}
                        className="w-full"
                      />
                      <span className="text-sm font-semibold">{filters.height.min} cm</span>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm text-gray-600 mb-1">Max Height</label>
                      <input
                        type="range"
                        min="150"
                        max="220"
                        value={filters.height.max}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          height: { ...prev.height, max: parseInt(e.target.value) }
                        }))}
                        className="w-full"
                      />
                      <span className="text-sm font-semibold">{filters.height.max} cm</span>
                    </div>
                  </div>
                </FilterSection>

                {/* Education */}
                <FilterSection title="Education">
                  <MultiSelect
                    options={educationOptions}
                    selected={filters.education}
                    onChange={(education) => setFilters(prev => ({ ...prev, education }))}
                    placeholder="Select education levels"
                  />
                </FilterSection>

                {/* Lifestyle */}
                <FilterSection title="Lifestyle Preferences">
                  <div className="space-y-4">
                    {Object.entries(lifestyleOptions).map(([key, options]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                          {key}
                        </label>
                        <MultiSelect
                          options={options}
                          selected={filters.lifestyle[key as keyof typeof filters.lifestyle]}
                          onChange={(values) => setFilters(prev => ({
                            ...prev,
                            lifestyle: { ...prev.lifestyle, [key]: values }
                          }))}
                          placeholder={`Select ${key} preferences`}
                        />
                      </div>
                    ))}
                  </div>
                </FilterSection>

                {/* Interests */}
                <FilterSection title="Interests">
                  <div className="grid grid-cols-3 gap-2">
                    {popularInterests.map((interest) => (
                      <button
                        key={interest}
                        onClick={() => {
                          const isSelected = filters.interests.includes(interest);
                          setFilters(prev => ({
                            ...prev,
                            interests: isSelected
                              ? prev.interests.filter(i => i !== interest)
                              : [...prev.interests, interest]
                          }));
                        }}
                        className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                          filters.interests.includes(interest)
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </FilterSection>

                {/* Deal Breakers */}
                <FilterSection title="Deal Breakers">
                  <div className="space-y-3">
                    {Object.entries(filters.dealBreakers).map(([key, value]) => (
                      <label key={key} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setFilters(prev => ({
                            ...prev,
                            dealBreakers: { ...prev.dealBreakers, [key]: e.target.checked }
                          }))}
                          className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {key === "mustHavePhotos" && "Must have photos"}
                          {key === "verifiedOnly" && "Verified profiles only"}
                          {key === "noSmoking" && "Non-smokers only"}
                          {key === "similarAge" && "Similar age range (+/- 5 years)"}
                        </span>
                      </label>
                    ))}
                  </div>
                </FilterSection>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 flex space-x-3">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                Reset All
              </Button>
              <Button
                onClick={handleApply}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              >
                Apply Filters
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </PremiumFeatureGate>
  );
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
}

function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
}

function MultiSelect({ options, selected, onChange, placeholder }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    const isSelected = selected.includes(option);
    onChange(
      isSelected
        ? selected.filter(item => item !== option)
        : [...selected, option]
    );
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 transition-colors"
      >
        <span className={selected.length === 0 ? "text-gray-500" : "text-gray-900"}>
          {selected.length === 0 
            ? placeholder 
            : `${selected.length} selected`
          }
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => toggleOption(option)}
              className="w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between"
            >
              <span>{option}</span>
              {selected.includes(option) && (
                <Check className="h-4 w-4 text-blue-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}