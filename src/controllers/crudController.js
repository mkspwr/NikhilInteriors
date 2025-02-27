class CrudController {
    constructor(ItemModel) {
        this.ItemModel = ItemModel;
    }

    async create(req, res) {
        try {
            const newItem = new this.ItemModel(req.body);
            await newItem.save();
            res.status(201).json(newItem);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    async read(req, res) {
        try {
            const items = await this.ItemModel.find();
            res.status(200).json(items);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async update(req, res) {
        try {
            const item = await this.ItemModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!item) {
                return res.status(404).json({ message: 'Item not found' });
            }
            res.status(200).json(item);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const item = await this.ItemModel.findByIdAndDelete(req.params.id);
            if (!item) {
                return res.status(404).json({ message: 'Item not found' });
            }
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = CrudController;