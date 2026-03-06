document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.querySelector('form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userData = {
                nombres: document.getElementById('reg-nombres').value,
                apellidos: document.getElementById('reg-apellidos').value,
                email: document.getElementById('reg-email').value,
                documento: document.getElementById('reg-documento').value,
                telefono: document.getElementById('reg-phone').value,
                password: document.getElementById('reg-password').value
            };

            try {
                await Auth.register(userData);
                alert('¡Registro exitoso! Se ha creado tu perfil de cliente.');
                window.location.href = 'index.html';
            } catch (error) {
                alert('Error al registrarse: ' + error.message);
            }
        });
    }
});
