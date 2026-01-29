/**
 * =============================================================================
 * AUTH PAGE STYLES - Shared animation styles for auth pages
 * =============================================================================
 */

export const authPageAnimationCSS = `
    @keyframes slide-fade-in {
        0% {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
        }
        100% {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .animate-slide-fade-in {
        animation: slide-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
`;
