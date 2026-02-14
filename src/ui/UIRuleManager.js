class RuleManager {
    constructor() {
        this._components = [];
        this.rules = [];
    }

    register(component) {

        // --- enregistrer les enfants (Panel, etc.) ---
        let kids = null;

        if (Array.isArray(component.children)) {
            kids = component.children;
        } else if (Array.isArray(component.components)) {
            kids = component.components;
        }

        if (kids) {
            kids.forEach(c => this.register(c));
        }

        // --- enregistrer le composant lui-même ---
        this._components.push(component);

        // --- interception du onChange ---
        const original = component.onChange || (() => {});
        component.onChange = (newState) => {
            original(newState);
            this.applyRules(component, newState);
        };
    }

    addRule(ruleFn) {
        this.rules.push(ruleFn);
    }

applyRules(source, newState) {
    console.log("[RULEMANAGER] applyRules from", source.name, "state =", newState);
    console.log("[RULEMANAGER] components =", this._components.map(c => c.name));

    for (let rule of this.rules) {
        rule(this._components, source, newState);
    }
}

}
