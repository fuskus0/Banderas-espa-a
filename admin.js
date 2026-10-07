// ====================================
// SUPABASE
// ====================================

const SUPABASE_URL =
    "https://yljxozttfnvyjrwrvcab.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_V73MAvXSKRKH6cZh_AfDxQ__0rXOxKE";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ====================================
// ELEMENTOS
// ====================================

const loginSection =
    document.getElementById("loginSection");

const adminPanel =
    document.getElementById("adminPanel");

const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");

const welcomeMessage =
    document.getElementById("welcomeMessage");

const logoutButton =
    document.getElementById("logoutButton");


// ====================================
// COMPROBAR SESIÓN
// ====================================

async function comprobarSesion() {

    const {
        data: {
            session
        }
    } = await supabaseClient
        .auth
        .getSession();


    if (session) {

        mostrarPanel(
            session.user
        );

    } else {

        mostrarLogin();

    }

}


// ====================================
// MOSTRAR LOGIN
// ====================================

function mostrarLogin() {

    loginSection.style.display =
        "block";

    adminPanel.style.display =
        "none";

}


// ====================================
// MOSTRAR PANEL
// ====================================

function mostrarPanel(usuario) {

    loginSection.style.display =
        "none";

    adminPanel.style.display =
        "block";

    welcomeMessage.textContent =
        "Sesión iniciada como: " +
        usuario.email;

}


// ====================================
// INICIAR SESIÓN
// ====================================

loginForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const email =
            document.getElementById(
                "email"
            ).value;

        const password =
            document.getElementById(
                "password"
            ).value;


        loginMessage.textContent =
            "Iniciando sesión...";


        const {
            data,
            error
        } = await supabaseClient
            .auth
            .signInWithPassword({
                email: email,
                password: password
            });


        if (error) {

            console.error(error);

            loginMessage.textContent =
                "❌ Correo o contraseña incorrectos.";

            return;

        }


        loginMessage.textContent =
            "";

        mostrarPanel(
            data.user
        );

    }
);


// ====================================
// CERRAR SESIÓN
// ====================================

logoutButton.addEventListener(
    "click",
    async function() {

        await supabaseClient
            .auth
            .signOut();

        mostrarLogin();

    }
);


// ====================================
// ARRANCAR
// ====================================

comprobarSesion();
