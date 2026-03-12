class TRRecPads extends UIComponent {

    constructor(cfg = {}) {
        super()

        this.aspectRatio = cfg.aspectRatio ?? 2.0

        const xp = cfg.xp ?? 0
        const yp = cfg.yp ?? 0
        const sp = cfg.sp ?? 10

        this.setResponsive(xp, yp, sp)
        this.updateResponsive()

        this.padCount = cfg.padCount ?? 4

        this.states = Array.from({ length:this.padCount }, () => ({
            etat:0,
            item:null
        }))

        this.pendingIndex = -1
        this.pendingBlink = 0
        this.pendingBlinkSpeed = 0.35

        this.locks = [false,false,false,false]

        this.measureIndex = 0
        this.initDur = 1

        this.btnPrevRect = null
        this.btnNextRect = null
        this.btnInitRect = null
        this.btnAddRect = null
    }

    // -------------------------------------------------------
    // MESURE
    // -------------------------------------------------------
    get measure() {
        return this.states.map(s => ({
            etat: s.etat === -1 ? 0 : s.etat,
            item: s.item
        }))
    }

set measure(arr) {
    if (!Array.isArray(arr)) return

    this.states = arr.map(s => ({
        etat: s.etat ?? 0,
        item: s.item ?? null
    }))

    // 🔥 Re‑clamping de sécurité
    for (let i=0; i<4; i++) {
        if (this.states[i].etat > 0) {
            this.states[i].etat = this.computeAllowedDuration(i, this.states[i].etat)
        }
    }

    this.pendingIndex = -1
    this.computeLocks()
    this.invalidate()
}


    // -------------------------------------------------------
    // UPDATE (blink)
    // -------------------------------------------------------
    update() {
        const old = this.pendingBlink
        this.pendingBlink += this.pendingBlinkSpeed

        if (this.pendingBlink > 1 || this.pendingBlink < 0)
            this.pendingBlinkSpeed *= -1

        if (Math.abs(this.pendingBlink - old) > 0.001)
            this.invalidate()
    }

    // -------------------------------------------------------
    // LOCKS (cohérence rythmique)
    // -------------------------------------------------------
    computeLocks() {
        this.locks = [false,false,false,false]

        for (let i=0; i<4; i++) {
            const s = this.states[i]
            if (s.etat > 0) {
                const dur = s.etat
                for (let k=1; k<dur; k++) {
                    if (i+k < 4) this.locks[i+k] = true
                }
            }
        }

        for (let i=0; i<4; i++) {
            if (this.states[i].etat > 0) this.locks[i] = false
        }
    }

    // -------------------------------------------------------
    // DURÉE CLAMPÉE
    // -------------------------------------------------------
computeAllowedDuration(index, requestedDur) {

    // borne naturelle
    let maxDur = Math.max(1, Math.min(requestedDur, 4 - index))

    // borne lock
    for (let k=1; k<maxDur; k++) {
        if (this.locks[index+k]) {
            maxDur = k
            break
        }
    }

    // borne collision
    for (let k=1; k<maxDur; k++) {
        if (this.states[index+k].etat > 0) {
            maxDur = k
            break
        }
    }

    return Math.max(1, maxDur)
}

    // -------------------------------------------------------
    // INTERACTION
    // -------------------------------------------------------
    mouseReleased(evt) {
        if (!evt) return
        if (!this.containsRect(evt)) return false

        const mx = evt.x
        const my = evt.y

        if (this._hit(this.btnPrevRect, mx, my)) {
            this.onChange?.({ type:"prev" })
            return true
        }
        if (this._hit(this.btnNextRect, mx, my)) {
            this.onChange?.({ type:"next" })
            return true
        }
        if (this._hit(this.btnInitRect, mx, my)) {
            this.initDur = (this.initDur % 4) + 1
            this.onChange?.({ type:"dur", value:this.initDur })
            this.invalidate()
            return true
        }
        if (this._hit(this.btnAddRect, mx, my)) {
            this.onChange?.({ type:"add" })
            return true
        }

        const padAreaH = this.h * 0.65
        const padSize = this.w / this.padCount

        if (my < this.y || my > this.y + padAreaH) return false

        const index = Math.floor((mx - this.x) / padSize)
        if (index < 0 || index >= this.padCount) return false

        if (this.locks[index]) return true

        const before = this.states[index].etat

        this.handlePadClick(index)

        if (this.pendingIndex === -1 && this.states[index].etat === 1 && before === 0) {
            this.onChange?.({ type:"assign", index })
        }

        this.computeLocks()
        return true
    }

    _hit(rect, mx, my) {
        if (!rect) return false
        return (
            mx >= rect.x &&
            mx <= rect.x + rect.w &&
            my >= rect.y &&
            my <= rect.y + rect.h
        )
    }

    // -------------------------------------------------------
    // LOGIQUE DES PADS
    // -------------------------------------------------------
    handlePadClick(index) {

        const step = this.states[index]
        const state = step.etat

        if (this.pendingIndex !== -1) {

            const from = this.pendingIndex
            const to   = index

            if (this.locks[to]) {
                this.pendingIndex = -1
                this.invalidate()
                return
            }

            if (to !== from) {

                const originalDur = this.states[from].etat
                const allowed = this.computeAllowedDuration(to, originalDur)

                this.states[to] = {
                    etat: allowed,
                    item: this.states[from].item
                }
            }

            this.states[from] = { etat:0, item:null }

            this.pendingIndex = -1
            this.invalidate()
            return
        }

        if (state === 0) {

            const allowed = this.computeAllowedDuration(index, this.initDur)
            step.etat = allowed

            this.invalidate()
            return
        }

        if (state > 0) {
            step.etat = -1
            this.pendingIndex = index
            this.invalidate()
            return
        }

        if (state === -1) {
            step.etat = 0
            step.item = null
            this.pendingIndex = -1
            this.invalidate()
            return
        }
    }

    // -------------------------------------------------------
    // RENDER
    // -------------------------------------------------------
    draw() {
        super.draw()

        fill(30)
        stroke(120)
        strokeWeight(this.w * 0.003)
        rect(this.x, this.y, this.w, this.h, this.h * 0.10)

        const padAreaH = this.h * 0.65
        const ctrlAreaY = this.y + padAreaH
        const ctrlAreaH = this.h * 0.35

        const padSize = this.w / this.padCount
        const padW = padSize * 0.90
        const padH = padAreaH * 0.90
        const padOffsetX = (padSize - padW) / 2
        const padOffsetY = (padAreaH - padH) / 2

        const sw = padW * 0.06
        const radius = padH * 0.20

        // -------------------------------------------------------
        // BANDEAUX DE LIAISON
        // -------------------------------------------------------
        for (let i=0; i<4; i++) {
            const s = this.states[i]
            if (s.etat > 1) {

                const dur = s.etat
                const startX = this.x + i * padSize
                const endX = this.x + (i + dur) * padSize

                const y = this.y + padOffsetY + padH * 0.35
                const h = padH * 0.30

                fill(180, 40, 40, 120)
                noStroke()
                rect(startX, y, endX - startX, h, h * 0.3)
            }
        }

        // -------------------------------------------------------
        // PADS
        // -------------------------------------------------------
        for (let i = 0; i < this.padCount; i++) {

            const step = this.states[i]
            const state = step.etat
            const locked = this.locks[i]

            const x = this.x + i * padSize + padOffsetX
            const y = this.y + padOffsetY

            push()

            if (locked && state === 0) {
                noStroke()
                fill(80, 20, 20)
                rect(x, y, padW, padH, radius)
                pop()
                continue
            }

            if (state === 0) {
                noFill()
                stroke(120, 30, 30)
                strokeWeight(sw)
            }

            else if (state === -1) {
                const alpha = map(this.pendingBlink, 0, 1, 50, 255)
                noFill()
                stroke(255, 60, 60, alpha)
                strokeWeight(sw * 1.3)
            }

            else {
                noStroke()
                fill(255, 60, 60)
            }

            rect(x, y, padW, padH, radius)

            if (state > 0) {

                const halfW = padW / 2
                const halfH = padH / 2

                fill(255, 60, 60)
                noStroke()

                if (state >= 1) rect(x, y, halfW, halfH)
                if (state >= 2) rect(x + halfW, y, halfW, halfH)
                if (state >= 3) rect(x, y + halfH, halfW, halfH)
                if (state >= 4) rect(x + halfW, y + halfH, halfW, halfH)
            }

            if (state !== 0 && step.item !== null) {
                fill(255)
                textAlign(CENTER, CENTER)
                textSize(padH * 0.35)
                text(step.item, x + padW/2, y + padH/2)
            }

            pop()
        }

        // -------------------------------------------------------
        // CONTROLS
        // -------------------------------------------------------
        const labelSize = ctrlAreaH * 0.35
        textAlign(LEFT, CENTER)
        textSize(labelSize)
        fill(200)
        text("SEQ " + this.measureIndex, this.x + this.w * 0.03, ctrlAreaY + ctrlAreaH/2)

        const btnW = this.w * 0.12
        const btnH = ctrlAreaH * 0.55
        const btnY = ctrlAreaY + ctrlAreaH * 0.22
        const btnGap = this.w * 0.02
        const btnText = ctrlAreaH * 0.40
        textSize(btnText)
        textAlign(CENTER, CENTER)

        this.btnPrevRect = {
            x: this.x + this.w * 0.30,
            y: btnY,
            w: btnW,
            h: btnH
        }
        fill(60)
        rect(this.btnPrevRect.x, this.btnPrevRect.y, btnW, btnH, btnH * 0.20)
        fill(200)
        text("◀", this.btnPrevRect.x + btnW/2, this.btnPrevRect.y + btnH/2)

        this.btnNextRect = {
            x: this.x + this.w * 0.30 + btnW + btnGap,
            y: btnY,
            w: btnW,
            h: btnH
        }
        fill(60)
        rect(this.btnNextRect.x, this.btnNextRect.y, btnW, btnH, btnH * 0.20)
        fill(200)
        text("▶", this.btnNextRect.x + btnW/2, this.btnNextRect.y + btnH/2)

        this.btnInitRect = {
            x: this.x + this.w * 0.30 + (btnW + btnGap) * 2,
            y: btnY,
            w: btnW,
            h: btnH
        }
        fill(80)
        rect(this.btnInitRect.x, this.btnInitRect.y, btnW, btnH, btnH * 0.20)
        fill(255)
        text("" + this.initDur, this.btnInitRect.x + btnW/2, this.btnInitRect.y + btnH/2)

        this.btnAddRect = {
            x: this.x + this.w * 0.30 + (btnW + btnGap) * 3,
            y: btnY,
            w: btnW,
            h: btnH
        }
        fill(90)
        rect(this.btnAddRect.x, this.btnAddRect.y, btnW, btnH, btnH * 0.20)
        fill(255)
        text("+", this.btnAddRect.x + btnW/2, this.btnAddRect.y + btnH/2)
    }
}
