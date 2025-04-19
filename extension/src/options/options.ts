import { mount } from "svelte";
import OptionsApp from "./options.svelte"; // Assuming your Svelte component is named OptionsApp

// Potentially import dbLib or other utilities if needed for options
import * as dbLib from "../lib/dbUtils";

const target = document.getElementById("app");

if (!target) {
  throw new Error('🌸 Mount point "#app" not found in options.html');
}

// Wrap the initialization and mounting logic in an async function if needed
const initializeOptions = async () => {
  try {
    // Perform any necessary async setup for options page
    await dbLib.initDatabase(); // Example if DB access is needed

    // Mount the Svelte application
    mount(OptionsApp, {
      target,
      props: {},
    });
  } catch (error) {
    console.error("❌ Error initializing options page:", error);
    target.innerHTML = `<p style="color: red;">Error: Could not initialize options page.</p>`;
  }
};

// Call the async function to start the initialization
initializeOptions();

// If no async setup is needed, mount directly:
// mount(OptionsApp, {
//   target,
//   props: {},
// });
