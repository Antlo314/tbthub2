/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                defNavy: '#002349',
                sovAmber: '#FFBF00',
            },
            fontFamily: {
                serif: ['Cinzel', 'serif'],
                mono: ['Fira Code', 'monospace'],
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
