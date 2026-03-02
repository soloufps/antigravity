document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;

            try {
                console.log('Iniciando proceso de login para:', email);
                const result = await Auth.login(email, password);

                console.log('Login exitoso. Tipo:', result.type);
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error en el proceso de login:', error);
                alert(error.message || 'Error al iniciar sesión. Por favor verifica tus credenciales.');
            }
        });
    }
});
