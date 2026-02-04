class UIManager {
    static components = [];

    static register(component) {
        UIManager.components.push(component);
    }

    static handleShortcut(k, code) {
        for (let c of UIManager.components) {

            // touche caractère
            if (c.shortcutKey && k.toLowerCase() === c.shortcutKey.toLowerCase()) {
                c.onShortcut();
            }

            // touche keyCode
            if (c.shortcutCode && code === c.shortcutCode) {
                c.onShortcut();
            }
        }
    }
}
