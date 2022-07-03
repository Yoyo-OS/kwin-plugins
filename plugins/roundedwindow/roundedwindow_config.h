#pragma once

 
#include <kcmodule.h>

class RoundedwindowConfig : public KCModule
{
    Q_OBJECT
public:
    explicit RoundedwindowConfig(QWidget* parent = 0, const QVariantList& args = QVariantList());
    ~RoundedwindowConfig();
public slots:
    void save() override;
    void load() override;
    void defaults() override;

private:
    class Private;
    Private * const d;
    friend class Private;
};
