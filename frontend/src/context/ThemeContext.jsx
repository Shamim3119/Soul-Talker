import {
    createContext,
    useContext,
    useEffect,
    useState,
} from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        const savedTheme =
            localStorage.getItem('soul-theme');

        if (
            savedTheme === 'light' ||
            savedTheme === 'dark'
        ) {
            return savedTheme;
        }

        return window.matchMedia(
            '(prefers-color-scheme: dark)'
        ).matches
            ? 'dark'
            : 'light';
    });

    useEffect(() => {
        document.documentElement.setAttribute(
            'data-theme',
            theme
        );

        localStorage.setItem(
            'soul-theme',
            theme
        );
    }, [theme]);

    const toggleTheme = () => {
        setTheme((current) =>
            current === 'dark'
                ? 'light'
                : 'dark'
        );
    };

    return (
        <ThemeContext.Provider
            value={{
                theme,
                toggleTheme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error(
            'useTheme must be used inside ThemeProvider'
        );
    }

    return context;
}