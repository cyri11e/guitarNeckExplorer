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

    static handleClick(x, y) {
        for (let c of UIManager.components) {
            if (c.containsRect(x, y)) {
                c.onClick?.();
            }
        }
    }


    static onComponentChange(component, newState) {
        console.log(
            "%c[RULE DISPATCH] source=" + component.constructor.name +
            "  id=" + (component.id ?? "none") +
            "  state=" + newState,
            "color:#00aaff; font-weight:bold;"
        );

        // Appel correct : (components, source, newState)
        for (const rule of UI_RULES) {
            rule(UIManager.components, component, newState);
        }
    }

}
