class UIInteractionManager {
    constructor() {
        this._components = [];   // <-- tableau simple
        this.rules = [];
        //console.log("INIT _components =", this._components);
    }

register(component) {
   // console.log("INSTANCE PROTOTYPE:", Object.getPrototypeOf(this));

    let kids = null;

    if (Array.isArray(component.children)) {
        kids = component.children;
    } else if (Array.isArray(component.components)) {
        kids = component.components;
    }

    if (kids) {
        kids.forEach(c => this.register(c));
    }

   // console.log("ADD:", component.constructor.name);
    this._components.push(component);
    //console.log("SIZE NOW =", this._components.length);

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
        //console.log("applyRules from", source.title, "state =", newState);
       // console.log("COMPONENTS PASSED TO RULE:", this._components);

        for (let rule of this.rules) {
            rule(this._components, source, newState);
        }
    }
}
