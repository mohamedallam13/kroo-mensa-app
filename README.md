# KROO Mensa Menu Application

A modern, responsive web application built with Google Apps Script that provides an interactive menu ordering system for KROO Mensa. This application offers a seamless ordering experience with real-time cart management, category-based menu navigation, and a beautiful, user-friendly interface.

## 🌟 Features

- **Modern UI/UX Design**
  - Responsive layout that works on all devices
  - Beautiful gradient headers and card-based design
  - Smooth animations and transitions
  - Dark mode support
  - Intuitive navigation with category-based browsing
  - Elegant loading states and transitions

- **Advanced Authentication System**
  - Secure email-based authentication
  - One-time verification code system
  - Automatic session persistence

- **Interactive Menu System**
  - Category-based navigation
  - Real-time search functionality
  - Detailed item descriptions and pricing
  - Customizable order options
  - High-quality image display
  - Smart image preloading for instant display
  - CDN-optimized image delivery

- **Shopping Cart Management**
  - Real-time cart updates
  - Item quantity adjustments
  - Order summary
  - Checkout process
  - Persistent cart state
  - Price calculations
  - Order history tracking

- **Performance Optimized**
  - Fast loading times
  - Efficient state management
  - Optimized asset loading
  - Smooth scrolling and interactions
  - Intelligent image preloading
  - CDN integration for fast content delivery
  - Caching mechanisms
  - Lazy loading where appropriate

- **Advanced Features**
  - Real-time menu updates
  - Error handling and recovery
  - User preferences storage
  - Responsive image handling
  - Cross-browser compatibility
  - Accessibility features
  - Keyboard navigation support

## 🛠️ Technical Stack

- **Frontend**
  - HTML5 & CSS3 with modern features
  - Vanilla JavaScript for interactivity
  - Font Awesome for icons
  - Custom CSS variables for theming

- **Backend**
  - Google Apps Script
  - Server-side processing
  - Secure data handling
  - API integrations

## 🚀 Getting Started

### Prerequisites

- Node.js and npm installed
- Google account with Apps Script access
- Basic knowledge of web development

### Installation

1. Install [CLASP](https://github.com/google/clasp) globally:
```bash
npm install -g @google/clasp
```

2. Login to CLASP:
```bash
clasp login
```

3. Clone this repository and pull the latest code:
```bash
clasp pull
```

## 💻 Development

### Local Development
- Use `clasp push` to push changes to Google Apps Script
- Use `clasp pull` to pull latest changes from Google Apps Script
- Use `clasp open` to open the project in the Google Apps Script editor

### Project Structure

```
├── index.html          # Main application interface
├── server/            # Server-side code
│   ├── Backend.js     # Core backend functionality
│   ├── Helpers.js     # Utility functions
│   ├── Middleware.js  # Request/response middleware
│   ├── Server.js      # Server configuration
│   └── env.js         # Environment configuration
```

## 🎨 Design System

The application uses a comprehensive design system with:
- Custom color palette with primary, success, and danger states
- Consistent spacing scale
- Standardized border radiuses
- Typography hierarchy
- Shadow system for depth
- Responsive breakpoints

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is proprietary and confidential. All rights reserved.

## 👥 Authors

- KROO Development Team

## 🙏 Acknowledgments

- Google Apps Script team for the platform
- Font Awesome for the icon system
- All contributors who have helped shape this project 