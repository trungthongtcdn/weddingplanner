/** Dấu hiệu nhận diện: hai vòng lồng nhau trong khung vuông xoay — gợi chữ Hỷ và đôi nhẫn, không sao chép chữ Hán. */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Trăm Năm">
      <rect x="6" y="6" width="36" height="36" rx="6" transform="rotate(45 24 24)" fill="currentColor" />
      <circle cx="19.5" cy="24" r="7" fill="none" stroke="#f5ecd9" strokeWidth="2.6" />
      <circle cx="28.5" cy="24" r="7" fill="none" stroke="#f5ecd9" strokeWidth="2.6" />
    </svg>
  );
}
