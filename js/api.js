const API = (() => {
    // Configuración base desde supabase.js (asumiendo que están accesibles y globales)
    // Usamos ||= para evitar errores si no están definidos aún
    const getBaseUrl = () => (window.SUPABASE_URL || 'https://vvychuxlfqispeafymld.supabase.co') + '/rest/v1';
    const getApiKey = () => (window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2eWNodXhsZnFpc3BlYWZ5bWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDAwNjMsImV4cCI6MjA4Nzc3NjA2M30.a21_8mSSkfYQel9Dl8m7V8EMI6i8-vZ6Z8oaBTR069Q');

    const getHeaders = async () => {
        const headers = {
            'apikey': getApiKey(),
            'Content-Type': 'application/json'
        };

        // Intentar obtener el token de sesión dinámicamente
        try {
            const { data } = await window.supabaseClient.auth.getSession();
            const token = data.session?.access_token || getApiKey();
            headers['Authorization'] = `Bearer ${token}`;
        } catch (e) {
            headers['Authorization'] = `Bearer ${getApiKey()}`;
        }

        return headers;
    };

    /**
     * Obtiene la lista de productos (GET)
     */
    const getProducts = async () => {
        try {
            const url = `${getBaseUrl()}/producto?select=*,tipo_producto(descripcion)&estado=eq.true&order=id_producto.desc`;
            const response = await fetch(url, {
                method: 'GET',
                headers: await getHeaders()
            });

            if (!response.ok) throw new Error('Error al cargar productos');
            const data = await response.json();

            return data.map(p => ({
                id: p.id_producto,
                name: p.nombre,
                price: parseFloat(p.precio),
                category: p.tipo_producto?.descripcion || 'General',
                image: p.imagen_url || 'https://via.placeholder.com/300x250?text=No+Image',
                description: p.descripcion,
                stock: p.stock
            }));
        } catch (error) {
            console.error('API Error (getProducts):', error);
            return [];
        }
    };

    /**
     * Obtiene categorías (GET)
     */
    const getCategories = async () => {
        try {
            const url = `${getBaseUrl()}/tipo_producto?select=*`;
            const response = await fetch(url, {
                method: 'GET',
                headers: await getHeaders()
            });
            if (!response.ok) throw new Error('Error al cargar categorías');
            return await response.json();
        } catch (error) {
            console.error('API Error (getCategories):', error);
            return [];
        }
    };

    /**
     * Sube una imagen (Prioridad Local para guardar en carpeta assets/imagenes)
     */
    const uploadImage = async (file) => {
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const relativeUrl = `assets/imagenes/${fileName}`;

        try {
            console.log('[DEBUG API] Intentando subida al servidor local...');

            const reader = new FileReader();
            const base64Promise = new Promise((resolve) => {
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
            const base64Data = await base64Promise;

            const localResponse = await fetch('http://localhost:3000/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: fileName, data: base64Data })
            });

            if (localResponse.ok) {
                console.log('[DEBUG API] Guardado localmente en carpeta assets/imagenes');
                return relativeUrl; // Retornamos la URL relativa para guardar en Supabase
            }
        } catch (e) {
            console.warn('[DEBUG API] Servidor local no detectado. Intentando respaldo en nube...');
        }

        // 2. Fallback a Supabase Storage (Si no hay servidor local)
        try {
            const { data, error } = await window.supabaseClient.storage
                .from('productos')
                .upload(fileName, file);

            if (error) {
                if (error.message === 'Bucket not found') {
                    throw new Error('Para guardar en tu carpeta local, ejecuta "iniciar_servidor.bat". Si quieres usar la nube, crea el bucket "productos" en Supabase.');
                }
                throw error;
            }

            // Aunque se suba a Supabase, devolvemos la URL relativa como pidió el usuario
            // Nota: Esto solo funcionará localmente si el usuario luego descarga la imagen
            console.log('[DEBUG API] Subido a la nube, pero guardando URL relativa en la base de datos.');
            return relativeUrl;
        } catch (error) {
            console.error('Error en la subida:', error);
            throw error;
        }
    };

    /**
     * Agrega un nuevo producto (POST)
     */
    const addProduct = async (product) => {
        try {
            const url = `${getBaseUrl()}/producto`;
            const body = JSON.stringify([{
                nombre: product.name,
                precio: product.price,
                descripcion: product.description,
                stock: product.stock,
                id_tipo_producto: product.categoryId,
                imagen_url: product.imageUrl,
                estado: true
            }]);

            const response = await fetch(url, {
                method: 'POST',
                headers: { ...(await getHeaders()), 'Prefer': 'return=representation' },
                body
            });

            if (!response.ok) throw new Error('Error al insertar producto');
            return await response.json();
        } catch (error) {
            console.error('API Error (addProduct):', error);
            throw error;
        }
    };

    /**
     * Obtiene ventas (GET)
     * La tabla se llama 'venta' y el cliente se llama 'cliente'
     */
    const getSales = async () => {
        try {
            const url = `${getBaseUrl()}/venta?select=*,cliente(nombres,apellidos,email)&order=fecha.desc`;
            console.log('[DEBUG API] Fetching sales from:', url);
            const response = await fetch(url, {
                method: 'GET',
                headers: await getHeaders()
            });
            console.log('[DEBUG API] Response status:', response.status);
            if (!response.ok) {
                const errText = await response.text();
                console.error('[DEBUG API] Sales fetch failed status:', response.status, 'body:', errText);
                throw new Error(`Error al cargar ventas (${response.status})`);
            }
            const data = await response.json();
            console.log('[DEBUG API] Sales data received:', data);
            return data;
        } catch (error) {
            console.error('[DEBUG API] Error (getSales):', error);
            return [];
        }
    };

    /**
     * Obtiene detalles de venta (GET)
     */
    const getSaleDetails = async (idVenta) => {
        try {
            const url = `${getBaseUrl()}/detalle_venta?select=*,producto(nombre,imagen_url)&id_venta=eq.${idVenta}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: await getHeaders()
            });
            if (!response.ok) throw new Error('Error al cargar detalles');
            return await response.json();
        } catch (error) {
            console.error('API Error (getSaleDetails):', error);
            return [];
        }
    };

    /**
     * Obtiene clientes (GET)
     */
    const getClients = async () => {
        try {
            const url = `${getBaseUrl()}/cliente?select=*&order=id_cliente.desc`;
            const response = await fetch(url, {
                method: 'GET',
                headers: await getHeaders()
            });
            if (!response.ok) throw new Error('Error al cargar clientes');
            return await response.json();
        } catch (error) {
            console.error('API Error (getClients):', error);
            return [];
        }
    };

    /**
     * Estadísticas (Varias llamadas GET)
     */
    const getStatistics = async () => {
        try {
            const headers = await getHeaders();
            const [salesRes, clientsRes, productsRes] = await Promise.all([
                fetch(`${getBaseUrl()}/venta?select=total`, { headers }),
                fetch(`${getBaseUrl()}/cliente?select=id_cliente`, { headers: { ...headers, 'Prefer': 'count=exact' } }),
                fetch(`${getBaseUrl()}/producto?select=id_producto`, { headers: { ...headers, 'Prefer': 'count=exact' } })
            ]);

            const sales = await salesRes.json();

            // Supabase devuelve el conteo en la cabecera Content-Range cuando se usa Prefer: count=exact
            const clientCount = parseInt(clientsRes.headers.get('content-range')?.split('/')[1] || 0);
            const productCount = parseInt(productsRes.headers.get('content-range')?.split('/')[1] || 0);

            const totalRevenue = sales.reduce((acc, s) => acc + parseFloat(s.total || 0), 0);
            const totalSales = sales.length;

            return { totalRevenue, totalSales, clientCount, productCount };
        } catch (error) {
            console.error('Error fetching statistics:', error);
            return { totalRevenue: 0, totalSales: 0, clientCount: 0, productCount: 0 };
        }
    };

    /**
     * Inserta una venta (POST)
     */
    const createSale = async (saleData) => {
        try {
            const url = `${getBaseUrl()}/venta`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { ...(await getHeaders()), 'Prefer': 'return=representation' },
                body: JSON.stringify([saleData])
            });
            if (!response.ok) throw new Error('Error al crear venta');
            return await response.json();
        } catch (error) {
            console.error('API Error (createSale):', error);
            throw error;
        }
    };

    /**
     * Inserta detalles de venta (POST)
     */
    const createSaleDetails = async (details) => {
        try {
            const url = `${getBaseUrl()}/detalle_venta`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { ...(await getHeaders()), 'Prefer': 'return=representation' },
                body: JSON.stringify(details)
            });
            if (!response.ok) throw new Error('Error al crear detalles de venta');
            return await response.json();
        } catch (error) {
            console.error('API Error (createSaleDetails):', error);
            throw error;
        }
    };

    return {
        getProducts,
        getCategories,
        uploadImage,
        addProduct,
        getSales,
        getSaleDetails,
        getClients,
        getStatistics,
        createSale,
        createSaleDetails
    };
})();
