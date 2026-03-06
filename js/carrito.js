const Carrito = (() => {
    const CART_KEY = 'tienda_carrito';

    const getItems = () => {
        return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    };

    const saveItems = (items) => {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
    };

    const add = (product) => {
        let items = getItems();
        const existing = items.find(item => item.id === product.id);
        if (existing) {
            existing.quantity += 1;
        } else {
            items.push({ ...product, quantity: 1 });
        }
        saveItems(items);
        if (window.updateCartBadge) updateCartBadge();

        // Notificación Bien Bonita
        if (window.showToast) {
            window.showToast('¡Añadido!', `${product.name} se agregó al carrito.`);
        }
    };

    const remove = (productId) => {
        let items = getItems();
        items = items.filter(item => item.id !== productId);
        saveItems(items);
        renderCartUI();
        if (window.updateCartBadge) updateCartBadge();
    };

    const updateQuantity = (productId, delta) => {
        let items = getItems();
        const item = items.find(i => i.id === productId);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) {
                items = items.filter(i => i.id !== productId);
            }
        }
        saveItems(items);
        renderCartUI();
        if (window.updateCartBadge) updateCartBadge();
    };

    const renderCartUI = () => {
        const container = document.getElementById('cart-items');
        if (!container) return;

        const items = getItems();
        if (items.length === 0) {
            container.innerHTML = '<p class="text-center py-10 text-slate-500">Tu carrito está vacío.</p>';
            updateTotals(0);
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="flex flex-col sm:flex-row gap-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/50">
                <div class="h-32 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                    <img class="h-full w-full object-cover" src="${item.image}" alt="${item.name}">
                </div>
                <div class="flex flex-1 flex-col justify-between">
                    <div class="flex justify-between">
                        <div>
                            <h3 class="text-lg font-bold text-slate-900 dark:text-white">${item.name}</h3>
                            <p class="mt-1 text-sm text-slate-500">${item.category}</p>
                        </div>
                        <p class="text-lg font-bold text-slate-900 dark:text-white">$${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    <div class="mt-4 flex items-center justify-between">
                        <div class="flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
                            <button class="px-3 py-1 text-slate-500 hover:text-primary" onclick="Carrito.updateQuantity(${item.id}, -1)">-</button>
                            <span class="px-3 py-1 font-medium text-slate-900 dark:text-white">${item.quantity}</span>
                            <button class="px-3 py-1 text-slate-500 hover:text-primary" onclick="Carrito.updateQuantity(${item.id}, 1)">+</button>
                        </div>
                        <button class="flex items-center text-sm font-medium text-red-500 hover:text-red-600" onclick="Carrito.remove(${item.id})">
                            <span class="material-symbols-outlined mr-1 text-lg">delete</span>
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        updateTotals(subtotal);
    };

    const updateTotals = (subtotal) => {
        const tax = subtotal * 0.08;
        const shipping = subtotal > 0 ? 12.50 : 0;
        const total = subtotal + tax + shipping;

        const subtotalEl = document.getElementById('subtotal');
        const taxEl = document.getElementById('tax');
        const shippingEl = document.getElementById('shipping');
        const totalEl = document.getElementById('total');

        if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
        if (shippingEl) shippingEl.textContent = `$${shipping.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

        return { subtotal, tax, shipping, total };
    };

    const checkout = async () => {
        const items = getItems();
        if (items.length === 0) {
            if (window.showToast) window.showToast('Carrito Vacío', 'Agrega algunos productos antes de comprar.', 'error');
            else alert('El carrito está vacío');
            return;
        }

        // 1. Mostrar formulario si está oculto
        const formContainer = document.getElementById('checkout-form-container');
        if (formContainer && formContainer.classList.contains('hidden')) {
            formContainer.classList.remove('hidden');
            formContainer.scrollIntoView({ behavior: 'smooth' });
            // Cambiar texto del botón
            const checkoutBtn = document.getElementById('checkout-btn');
            if (checkoutBtn) checkoutBtn.textContent = 'Confirmar Pedido';
            return;
        }

        // 2. Validar campos
        const direccion = document.getElementById('chk-direccion')?.value;
        const telefono = document.getElementById('chk-telefono')?.value;
        const metodoPago = document.querySelector('input[name="payment-method"]:checked')?.value;
        const notas = document.getElementById('chk-notas')?.value;

        if (!direccion || !telefono || !metodoPago) {
            alert('Por favor completa todos los campos de envío y selecciona un método de pago');
            return;
        }

        // 3. Verificar autenticación (LOGIN OBLIGATORIO)
        const user = await Auth.getUser();
        if (!user) {
            if (window.showToast) {
                window.showToast('Sesión Requerida', 'Debes iniciar sesión para realizar la compra.', 'error');
            } else {
                alert('Debes iniciar sesión para realizar la compra');
            }
            // Redirigir a login después de un breve delay para que vean el toast
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return;
        }

        const emailToUse = user.email;

        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.textContent = 'Procesando...';
        }

        try {
            // 4. Obtener id_cliente vinculado a la cuenta
            const { data: cliente, error: cliError } = await window.supabaseClient
                .from('cliente')
                .select('id_cliente')
                .eq('email', emailToUse)
                .single();

            if (cliError) throw new Error('No se encontró el perfil de cliente configurado para esta cuenta.');

            // 5. Crear Venta
            const totals = updateTotals(items.reduce((acc, item) => acc + (item.price * item.quantity), 0));
            const { data: venta, error: vntError } = await window.supabaseClient
                .from('venta')
                .insert([{
                    id_cliente: cliente.id_cliente,
                    total: totals.total,
                    metodo_pago: metodoPago,
                    estado: 'PENDIENTE',
                    direccion_id: null, // Podríamos guardar la dirección aquí si el esquema lo permite, o en un campo notas
                    // Si no hay campo 'notas' en 'venta', lo logueamos o lo concatenamos con la dirección
                }])
                .select()
                .single();

            if (vntError) throw vntError;

            // 6. Crear Detalles
            const detalles = items.map(item => ({
                id_venta: venta.id_venta,
                id_producto: item.id,
                cantidad: item.quantity,
                precio_unitario: item.price,
                subtotal: item.price * item.quantity
            }));

            const { error: dtlError } = await window.supabaseClient
                .from('detalle_venta')
                .insert(detalles);

            if (dtlError) throw dtlError;

            // 7. Finalizar
            if (window.showToast) {
                window.showToast('¡Éxito!', 'Compra realizada con éxito. Nos contactaremos pronto.');
            } else {
                alert('¡Compra realizada con éxito! Nos contactaremos contigo pronto.');
            }

            saveItems([]);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            if (window.showToast) window.showToast('Error', error.message, 'error');
            else alert('Error al procesar la compra: ' + error.message);
            console.error(error);
            if (checkoutBtn) {
                checkoutBtn.disabled = false;
                checkoutBtn.textContent = 'Confirmar Pedido';
            }
        }
    };

    return {
        getItems,
        add,
        remove,
        updateQuantity,
        renderCartUI,
        checkout
    };
})();
