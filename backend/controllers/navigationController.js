const pool = require('../config/db');

const buildTree = (modules) => {
    const moduleMap = new Map();

    modules.forEach((module) => {
        moduleMap.set(module.id, {
            id: module.id,
            parent_id: module.parent_id,
            name: module.name,
            code: module.code,
            route: module.route,
            icon: module.icon,
            sort_order: module.sort_order,
            show_in_sidebar: Boolean(module.show_in_sidebar),
            show_as_tab: Boolean(module.show_as_tab),
            children: [],
        });
    });

    const tree = [];

    moduleMap.forEach((module) => {
        if (
            module.parent_id !== null &&
            moduleMap.has(module.parent_id)
        ) {
            moduleMap.get(module.parent_id).children.push(module);
        } else {
            tree.push(module);
        }
    });

    const sortModules = (items) => {
        items.sort((a, b) => a.sort_order - b.sort_order);

        items.forEach((item) => {
            if (item.children.length > 0) {
                sortModules(item.children);
            }
        });
    };

    sortModules(tree);

    return tree;
};

const getNavigation = async (req, res) => {
    try {
        const sessionUser = req.session?.user;

        if (!sessionUser) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const [users] = await pool.execute(
            `
            SELECT
                id,
                is_super_admin
            FROM tbl_user
            WHERE id = ?
            LIMIT 1
            `,
            [sessionUser.id]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User account not found',
            });
        }

        const isSuperAdmin =
            Number(users[0].is_super_admin) === 1;

        let modules;

        if (isSuperAdmin) {
            const [rows] = await pool.execute(
                `
                SELECT
                    id,
                    parent_id,
                    name,
                    code,
                    route,
                    icon,
                    sort_order,
                    show_in_sidebar,
                    show_as_tab
                FROM access_modules
                WHERE is_active = 1
                ORDER BY sort_order, id
                `
            );

            modules = rows;
        } else {
            /*
             * First obtain the modules for which the user has
             * at least one active permission.
             */
            const [permittedModules] = await pool.execute(
                `
                SELECT DISTINCT
                    m.id,
                    m.parent_id,
                    m.name,
                    m.code,
                    m.route,
                    m.icon,
                    m.sort_order,
                    m.show_in_sidebar,
                    m.show_as_tab
                FROM user_permissions up
                INNER JOIN access_permissions ap
                    ON ap.id = up.permission_id
                INNER JOIN access_modules m
                    ON m.id = ap.module_id
                WHERE up.user_id = ?
                  AND ap.is_active = 1
                  AND m.is_active = 1
                `,
                [sessionUser.id]
            );

            /*
             * Navigation needs parent containers as well.
             *
             * Since our current hierarchy is small, load all active
             * modules and then keep permitted modules plus their
             * ancestors.
             */
            const [allModules] = await pool.execute(
                `
                SELECT
                    id,
                    parent_id,
                    name,
                    code,
                    route,
                    icon,
                    sort_order,
                    show_in_sidebar,
                    show_as_tab
                FROM access_modules
                WHERE is_active = 1
                `
            );

            const allModuleMap = new Map(
                allModules.map((module) => [module.id, module])
            );

            const allowedIds = new Set();

            permittedModules.forEach((module) => {
                let current = module;

                while (current) {
                    allowedIds.add(current.id);

                    if (current.parent_id === null) {
                        break;
                    }

                    current = allModuleMap.get(current.parent_id);
                }
            });

            modules = allModules.filter((module) =>
                allowedIds.has(module.id)
            );
        }

        const navigation = buildTree(modules);

        return res.status(200).json({
            success: true,
            navigation,
        });
    } catch (error) {
        console.error('Unable to load navigation:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to load navigation',
        });
    }
};

module.exports = {
    getNavigation,
};