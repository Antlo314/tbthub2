import './globals.css';
import { Inter, Cinzel, Fira_Code } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel' });
const firaCode = Fira_Code({ subsets: ['latin'], variable: '--font-fira-code' });

export const metadata = {
    title: 'The Sanctum',
    description: 'Project Sovereign Protocol',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${cinzel.variable} ${firaCode.variable} font-sans`}>
                {children}
            </body>
        </html>
    );
}
