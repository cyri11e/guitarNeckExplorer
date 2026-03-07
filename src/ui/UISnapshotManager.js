class SnapshotManager {
    constructor() {
        this.snapshots = [];
    }

    add(snapshot) {
        this.snapshots.push(snapshot);
        snapshotPanel.addSnapshot(snapshot);
    }

    restore(index) {
        const snap = this.snapshots[index];
        guitar.restoreState(snap.state);
    }

    exportJSON() {
        return JSON.stringify({ snapshots: this.snapshots });
    }

    importJSON(json) {
        const data = JSON.parse(json);
        this.snapshots = data.snapshots;
        snapshotPanel.reload(this.snapshots);
    }
}
