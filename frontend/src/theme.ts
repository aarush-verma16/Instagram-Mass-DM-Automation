import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#405DE6', // Instagram blue
      light: '#5B76FF',
      dark: '#2742B3',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#E1306C', // Instagram pink/red
      light: '#FF5A8D',
      dark: '#AD004D',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F8F8F8',
      paper: '#FFFFFF',
    },
    error: {
      main: '#ED4956', // Instagram error red
    },
    warning: {
      main: '#FCAF45', // Instagram golden yellow
    },
    info: {
      main: '#833AB4', // Instagram purple
    },
    success: {
      main: '#4CAF50', // Green for success messages
    },
  },
  typography: {
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h1: {
      fontSize: '1.8rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.3rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.2rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.1rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});

export default theme;
