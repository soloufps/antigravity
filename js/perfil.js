document.addEventListener('DOMContentLoaded', async () => {
    // Configuración base desde supabase.js (asumiendo que están accesibles)
    const baseUrl = window.supabaseClient.supabaseUrl + '/rest/v1';
    const apiKey = window.supabaseClient.supabaseKey;

    const getHeaders = () => ({
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    });

    const user = await Auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const isAdmin = await Auth.isAdmin();
    const profileForm = document.getElementById('profile-form');
    const editBtn = document.getElementById('edit-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const passwordSection = document.getElementById('password-section');
    const inputs = profileForm.querySelectorAll('input:not(#perf-email)');

    // UI Elements
    const displayName = document.getElementById('display-name');
    const displayRole = document.getElementById('display-role');
    const profileAvatar = document.getElementById('profile-avatar');

    let userData = null;

    // Cargar datos iniciales
    async function loadUserData() {
        if (isAdmin) {
            displayName.textContent = user.user_metadata?.full_name || user.email.split('@')[0];
            displayRole.textContent = 'Administrador de Sistema';
            document.getElementById('perf-email').value = user.email;
            document.getElementById('perf-nombres').value = user.user_metadata?.full_name?.split(' ')[0] || '';
            document.getElementById('perf-apellidos').value = user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';
            document.getElementById('perf-telefono').value = 'No disponible para Admin';
            document.getElementById('perf-telefono').disabled = true;
            document.getElementById('perf-direccion').value = 'No disponible para Admin';
            document.getElementById('perf-direccion').disabled = true;
            editBtn.style.display = 'none';
        } else {
            userData = await Auth.getClientProfile(user.email);
            if (userData) {
                const fullName = `${userData.nombres} ${userData.apellidos}`;
                displayName.textContent = fullName;
                displayRole.textContent = 'Cliente ProStore';
                profileAvatar.src = `https://ui-avatars.com/api/?name=${fullName}&background=135bec&color=fff`;

                document.getElementById('perf-email').value = userData.email;
                document.getElementById('perf-nombres').value = userData.nombres;
                document.getElementById('perf-apellidos').value = userData.apellidos;
                document.getElementById('perf-telefono').value = userData.telefono || '';
                document.getElementById('perf-direccion').value = userData.direccion || '';
                document.getElementById('perf-ciudad').value = userData.ciudad || '';
                document.getElementById('perf-zip').value = userData.zip || '';
            }
        }
    }

    await loadUserData();

    // Lógica de Edición
    editBtn.addEventListener('click', () => {
        inputs.forEach(input => {
            if (!input.disabled) {
                input.readOnly = false;
                input.classList.remove('bg-slate-50', 'dark:bg-slate-800/50');
                input.classList.add('bg-white', 'dark:bg-slate-800', 'border-primary');
            }
        });
        passwordSection.classList.remove('hidden');
        editBtn.classList.add('hidden');
        saveBtn.classList.remove('hidden');
        cancelBtn.classList.remove('hidden');
    });

    cancelBtn.addEventListener('click', () => {
        location.reload();
    });

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(profileForm);
        const newData = {
            nombres: formData.get('nombres'),
            apellidos: formData.get('apellidos'),
            telefono: formData.get('telefono'),
            direccion: formData.get('direccion'),
            ciudad: formData.get('ciudad'),
            zip: formData.get('zip'),
            password: formData.get('password') || (userData ? userData.password : '')
        };

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';

            // Actualizar usando FETCH nativo (Requisito)
            const url = `${baseUrl}/cliente?email=eq.${user.email}`;
            const response = await fetch(url, {
                method: 'PATCH', // Usamos PATCH para actualizar campos específicos
                headers: getHeaders(),
                body: JSON.stringify({
                    nombres: newData.nombres,
                    apellidos: newData.apellidos,
                    telefono: newData.telefono,
                    direccion: newData.direccion,
                    ciudad: newData.ciudad,
                    zip: newData.zip,
                    password: newData.password
                })
            });

            if (!response.ok) throw new Error('Error al actualizar perfil');

            alert('¡Perfil actualizado con éxito!');
            location.reload();
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Error al actualizar: ' + error.message);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar Cambios';
        }
    });
});
