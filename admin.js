<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>Administración · Banderas de España</title>

    <link
        rel="stylesheet"
        href="style.css"
    >
</head>

<body>

    <main class="admin-container">

        <!-- ========================= -->
        <!-- LOGIN -->
        <!-- ========================= -->

        <section
            id="loginSection"
            class="admin-login"
        >

            <div class="admin-login-box">

                <h1>🇪🇸 Administración</h1>

                <p>
                    Acceso exclusivo para administradores.
                </p>

                <form id="loginForm">

                    <label for="email">
                        Correo electrónico
                    </label>

                    <input
                        id="email"
                        type="email"
                        autocomplete="username"
                        required
                    >

                    <label for="password">
                        Contraseña
                    </label>

                    <input
                        id="password"
                        type="password"
                        autocomplete="current-password"
                        required
                    >

                    <button
                        type="submit"
                        class="admin-login-button"
                    >
                        Iniciar sesión
                    </button>

                </form>

                <p
                    id="loginMessage"
                    class="admin-message"
                ></p>

            </div>

        </section>


        <!-- ========================= -->
        <!-- PANEL ADMIN -->
        <!-- ========================= -->

        <section
            id="adminPanel"
            class="admin-panel"
            style="display: none;"
        >

            <header class="admin-header">

                <div>
                    <h1>🇪🇸 Panel de administración</h1>

                    <p>
                        Banderas pendientes de revisión
                    </p>
                </div>

                <button
                    id="logoutButton"
                    class="logout-button"
                >
                    Cerrar sesión
                </button>

            </header>


            <div class="admin-stats">

                <div class="admin-stat">

                    <span id="pendingCount">
                        0
                    </span>

                    <small>
                        Pendientes
                    </small>

                </div>

            </div>


            <div
                id="pendingList"
                class="pending-list"
            >

                <p>
                    Inicia sesión para ver las banderas.
                </p>

            </div>

        </section>

    </main>


    <!-- SUPABASE -->
    <script
        src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">
    </script>

    <!-- NUESTRO JAVASCRIPT -->
    <script src="admin.js"></script>

</body>

</html>
