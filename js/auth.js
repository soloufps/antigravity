const Auth = (() => {
    const CLIENT_SESSION_KEY = 'ps_client_session';

    // Configuración base desde supabase.js
    const baseUrl = window.supabaseClient.supabaseUrl + '/rest/v1';
    const apiKey = window.supabaseClient.supabaseKey;

    const getHeaders = () => ({
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    });

    /**
     * Login dual (Supabase Auth y Fetch para tabla cliente)
     */
    const login = async (email, password) => {
        try {
            // 1. Intentar con SDK de Supabase Auth (Sistema de Cuentas principal)
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email,
                password,
            });

            if (!error) {
                window._isAdminCache = true;
                localStorage.removeItem(CLIENT_SESSION_KEY);
                return { type: 'admin', user: data.user };
            }

            // 2. Si falla Auth, intentar con FETCH nativo a la tabla 'cliente'
            const url = `${baseUrl}/cliente?email=eq.${email}&password=eq.${password}&select=*`;
            const response = await fetch(url, {
                method: 'GET',
                headers: getHeaders()
            });

            if (!response.ok) throw new Error('Error de conexión con la base de datos');
            const results = await response.json();
            const client = results[0];

            if (!client) {
                throw new Error('Correo o contraseña incorrectos');
            }

            // Guardar sesión manual
            const clientSession = {
                id: client.id_cliente,
                email: client.email,
                full_name: `${client.nombres} ${client.apellidos}`,
                type: 'client'
            };
            localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(clientSession));
            window._isAdminCache = false;

            return { type: 'client', user: clientSession };
        } catch (error) {
            throw error;
        }
    };

    /**
     * Registro con FETCH POST a la tabla 'cliente'
     */
    const register = async (userData) => {
        try {
            const url = `${baseUrl}/cliente`;
            const body = JSON.stringify([{
                nombres: userData.nombres,
                apellidos: userData.apellidos,
                email: userData.email,
                documento: userData.documento,
                telefono: userData.telefono,
                password: userData.password,
                estado: true
            }]);

            const response = await fetch(url, {
                method: 'POST',
                headers: getHeaders(),
                body
            });

            if (!response.ok) throw new Error('Error al registrar cliente');
            return await response.json();
        } catch (error) {
            console.error('Registration Error:', error);
            throw error;
        }
    };

    const logout = async () => {
        await window.supabaseClient.auth.signOut();
        localStorage.removeItem(CLIENT_SESSION_KEY);
        localStorage.removeItem('ps_is_admin');
        window._isAdminCache = undefined;
        window.location.href = 'index.html';
    };

    const getUser = async () => {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (user) return user;

        const saved = localStorage.getItem(CLIENT_SESSION_KEY);
        if (saved) {
            const clientData = JSON.parse(saved);
            return {
                id: clientData.id,
                email: clientData.email,
                user_metadata: { full_name: clientData.full_name },
                isClient: true
            };
        }
        return null;
    };

    const getClientProfile = async (email) => {
        try {
            const url = `${baseUrl}/cliente?email=eq.${email}&select=*`;
            const response = await fetch(url, {
                method: 'GET',
                headers: getHeaders()
            });
            const data = await response.json();
            return data[0] || null;
        } catch (error) {
            return null;
        }
    };

    const isLoggedIn = async () => {
        const user = await getUser();
        return !!user;
    };

    const isAdmin = async () => {
        if (localStorage.getItem(CLIENT_SESSION_KEY)) return false;
        const user = await getUser();
        if (!user || user.isClient) return false;

        if (window._isAdminCache !== undefined) return window._isAdminCache;

        // Intentar recuperar de caché local persistente
        const cachedAdmin = localStorage.getItem('ps_is_admin');
        if (cachedAdmin !== null) {
            window._isAdminCache = cachedAdmin === 'true';
            return window._isAdminCache;
        }

        const profile = await getClientProfile(user.email);
        window._isAdminCache = !profile;
        localStorage.setItem('ps_is_admin', window._isAdminCache);
        return window._isAdminCache;
    };

    const guardAdmin = async () => {
        const admin = await isAdmin();
        if (!admin) {
            alert('Acceso denegado.');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    };

    return { login, register, logout, getUser, getClientProfile, isLoggedIn, isAdmin, guardAdmin };
})();
