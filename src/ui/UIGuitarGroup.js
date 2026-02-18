class NoteGroup {
    constructor(cfg = {}) {
        this.id = cfg.id ?? uid();
        this.name = cfg.name ?? "Group";
        this.root = cfg.root ?? null;
        this.notes = cfg.notes ?? []; // {fret, string, pc}
        this.color = cfg.color ?? "#ff0000";
        this.visible = true;
        this.mode = cfg.mode ?? "free"; // "scale", "chord", "pattern", etc.
    }


}
