const ITEMS = [
    {
        name: "workbench",
        visibleName: "Верстак",
        description: "Требуется для создания основной части предметов в игре",
        maxCount: 1,
        type: "building",
        crafts: [{name: "wood", count: 100}]
    },

    {
        name: "wooden_sword",
        visibleName: "Деревянный меч",
        description: "Слабый меч из древесины. Подходит для начального уровня. Есть риск поломки во время боя.",
        type: "weapon",
        oneUseTime: 1000,
        length: 100,
        damage: [5, 15],
        degrees: 60,
        maxCount: 1,
        crafts: [{name: "wood", count: 60}]
    },
    {
        name: "wooden_ax",
        visibleName: "Деревянный топор",
        description: "Слабый топор из древесины. Подохдит для начального уровня.",
        type: "tool",
        damage: [1, 500], // todo
        oneUseTime: 900,
        length: 100,
        canMine: [{res: "wood", amount: 2}],
        degrees: 60,
        maxCount: 1,
        crafts: [{name: "wood", count: 25}]
    },
    {
        name: "wooden_pick",
        visibleName: "Деревянная кирка",
        description: "Слабая кирка из древесины. Добывает минимальное количество камня, подохдит для начального уровня.",
        type: "tool",
        damage: [2, 7],
        oneUseTime: 1500,
        length: 120,
        canMine: [{res: "wood", amount: 1}, {res: "stone", amount: 1}],
        degrees: 60,
        maxCount: 1,
        crafts: [{name: "wood", count: 60}],
        // needWorkbench: true
    },


    {
        name: "stone_sword",
        visibleName: "Каменный меч",
        description: "Крепкий меч из камня. Холодный и тяжелый.",
        type: "weapon",
        oneUseTime: 1200,
        length: 100,
        damage: [10, 19],
        degrees: 60,
        maxCount: 1,
        crafts: [{name: "stone", count: 60}, {name: "wooden_sword", count: 1}]
    },
    {
        name: "stone_ax",
        visibleName: "Каменный топор",
        description: "Тяжелый и мощный топор из холодного камня.",
        type: "tool",
        damage: [2, 7],
        oneUseTime: 900,
        length: 100,
        canMine: [{res: "wood", amount: 4}],
        degrees: 60,
        maxCount: 1,
        crafts: [{name: "stone", count: 60}, {name: "wooden_ax", count: 1}]
    },
    {
        name: "stone_pick",
        visibleName: "Каменная кирка",
        description: "Кирка из камня, позволяет в небольших количествах добывать золотую руду.",
        type: "tool",
        damage: [2, 7],
        oneUseTime: 1000,
        length: 120,
        canMine: [{res: "wood", amount: 1}, {res: "stone", amount: 3}, {res: "gold", amount: 2}],
        degrees: 60,
        maxCount: 1,
        crafts: [{name: "stone", count: 60}, {name: "wooden_pick", count: 1}],
        // needWorkbench: true
    },


    {
        name: "golden_sword",
        visibleName: "Золотой меч",
        description: "Мощнейшее золотое оружие.",
        type: "weapon",
        oneUseTime: 1200,
        length: 100,
        damage: [30, 40],
        degrees: 140,
        maxCount: 1,
        crafts: [{name: "gold", count: 100}, {name: "stone_sword", count: 2}]
    },
    {
        name: "golden_ax",
        visibleName: "Золотой топор",
        description: "Мощный топор из чистешего золота.",
        type: "tool",
        damage: [5, 10],
        oneUseTime: 700,
        length: 100,
        canMine: [{res: "wood", amount: 11}],
        degrees: 60,
        maxCount: 1,
        crafts: [{name: "gold", count: 100}, {name: "stone_ax", count: 1}]
    },
    {
        name: "golden_pick",
        visibleName: "Золотая кирка",
        description: "Кирка из чистого золота для добычи золота. Что может быть лучше?",
        type: "tool",
        damage: [5, 10],
        oneUseTime: 750,
        length: 120,
        canMine: [{res: "wood", amount: 2}, {res: "stone", amount: 7}, {res: "gold", amount: 5}],
        degrees: 60,
        maxCount: 1,
        crafts: [{name: "gold", count: 100}, {name: "stone_pick", count: 1}],
        // needWorkbench: true
    },


    {
        name: "wooden_wall",
        visibleName: "Деревянная стена",
        description: "Слабая защитная стена из древесины",
        maxCount: 60,
        type: "building",
        crafts: [{name: "wood", count: 10}]
    },
    {
        name: "stone_wall",
        visibleName: "Каменная стена",
        description: "Довольно прочная стена из камня.",
        maxCount: 60,
        type: "building",
        crafts: [{name: "stone", count: 10}]
    },
    {
        name: "golden_wall",
        visibleName: "Золотая стена",
        description: "Крепкая стена из чистого золота. Дорого, но оправдывает свою цену",
        maxCount: 60,
        type: "building",
        crafts: [{name: "gold", count: 10}]
    },
    {
        name: "wood",
        visibleName: "Древесина",
        description: "Основной ресурс.",
        type: "resource",
        maxCount: 96
    },
    {
        name: "stone",
        visibleName: "Камень",
        type: "resource",
        description: "Основной ресурс.",
        maxCount: 64
    },
    {
        name: "gold",
        visibleName: "Золотая руда",
        description: "Основной редкий ресурс.",
        type: "resource",
        maxCount: 32
    }
]

module.exports.getItemStats = (itemName) => {
    if (!itemName) return false;
    let item = ITEMS.find(i => i.name === itemName);
    if (!item) return false;
    item = Object.assign({}, item);
    return item;
}
module.exports.getVisibleType = (type) => {
    return {
        resource: "расходуемый материал",
        tool: "инструмент",
        weapon: "оружие",
        building: "сооружение"
    }[type];
}
module.exports.getVisibleResourceName = (resource) => {
    return {
        wood: "древесина",
        stone: "камень"
    }[resource];
}
module.exports.getFullDescription = (item, localState) => {
    return item.description +
        "\n\n" +
        "Тип предмета: " + module.exports.getVisibleType(item.type) +
        "\nВ слоту: " + localState.count + "/" + item.maxCount + "." +
        (item.type === "weapon" || item.type === "tool" ?
            "\n\nУрон: " + item.damage[0] + "..." + item.damage[1] +
            ".\nВремя перезарядкиL " + (item.oneUseTime / 1000) + " с." : "") +
        (item.type === "tool" ?
            "\n\nМожет добывать: " + item.canMine.map(r => {
                return module.exports.getVisibleResourceName(r.res) + " (" + r.amount + ")"
            }).join(", ") + "." :
            "")

}
module.exports.mineFromObject = (object) => {
    return {
        tree: "wood",
        stone: "stone"
    }[object];
}
module.exports.getItemStates = () => {
    return ITEMS.map(i => {
        return {
            name: i.name,
            visibleName: i.visibleName ? i.visibleName : this.getVisibleResourceName(i.name),
            maxCount: i.maxCount,
            description: i.description,
            type: i.type,
            crafts: i.crafts ? i.crafts : [],
            canMine: i.canMine ? i.canMine.map(cm => {
                return {
                    name: cm.res,
                    amount: cm.amount
                }
            }) : undefined,
            length: i.length,
            degrees: i.degrees,
            damage: i.damage,
            oneUseTime: i.oneUseTime,
            needWorkbench: i.needWorkbench
        }
    })
}