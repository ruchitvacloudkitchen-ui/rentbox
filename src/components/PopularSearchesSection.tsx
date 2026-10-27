import React from 'react';
import { Link } from 'react-router-dom';
import { HYDERABAD_SEO_PAGES } from '../utils/seoKeywords';

interface PopularSearchesSectionProps {
  currentSlug?: string;
  onSelectLink?: () => void;
}

export const PopularSearchesSection: React.FC<PopularSearchesSectionProps> = ({
  currentSlug,
  onSelectLink,
}) => {
  return (
    <div
      aria-label="Popular searches in Hyderabad"
      className="rounded-2xl border border-[#DCEAD7] bg-[#F5FAF3] p-3 space-y-2 max-h-60 overflow-y-auto"
    >
      <p className="text-[10px] font-semibold text-[#5C6B5E]">
        Popular Searches in Hyderabad · హైదరాబాద్‌లో ప్రముఖ అద్దె ఇళ్ల సెర్చ్‌లు
      </p>

      <div className="flex flex-wrap gap-1.5">
        {HYDERABAD_SEO_PAGES.map((page) => {
          const isActive = currentSlug === page.slug;
          return (
            <Link
              key={page.slug}
              to={`/${page.slug}`}
              onClick={onSelectLink}
              className={`px-2 py-1 rounded-lg text-[10px] leading-tight font-medium border transition-colors ${
                isActive
                  ? 'bg-[#417545] border-[#417545] text-white font-semibold'
                  : 'bg-white border-[#DCEAD7] text-[#417545] hover:bg-[#EAF4E7]'
              }`}
            >
              {page.keyword}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
