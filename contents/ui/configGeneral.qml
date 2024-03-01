import QtQuick 2.0
import QtQuick.Controls 2.5 as QQC2
import org.kde.kirigami 2.4 as Kirigami

Kirigami.FormLayout {
    id: page

    property alias cfg_maxHeightPercent: maxHeightPercent.text
    property alias cfg_sizes: sizes.text

    QQC2.TextField {
        id: maxHeightPercent
        Kirigami.FormData.label: i18n("Max height percent:")
        placeholderText: i18n("100")
    }

    QQC2.TextField {
        id: sizes
        Kirigami.FormData.label: i18n("Sizes:")
        placeholderText: i18n("75,66.6666,50,33.3333,25")
    }
}
