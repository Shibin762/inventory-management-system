// frontend/js/login.js - NEW FILE for login page script
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorElement = document.getElementById('login-error');
            
            // Clear previous errors
            errorElement.textContent = '';
            
            try {
                await Auth.login(username, password);
                // Redirect to main application
                window.location.href = '/';
            } catch (error) {
                errorElement.textContent = error.message || 'Login failed. Please check your credentials.';
            }
        });
    }
});
